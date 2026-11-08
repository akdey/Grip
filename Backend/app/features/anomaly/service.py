import uuid
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
import zoneinfo
import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_

from app.core.config import get_settings
from app.features.anomaly.models import AnomalyFlag
from app.features.transactions.models import Transaction, TransactionStatus
from app.features.settle_up.models import SettleUpEntry, SettleUpPeerContact
from app.features.categories.models import SubCategory
from app.features.bills.models import Bill

logger = logging.getLogger(__name__)
settings = get_settings()

class AnomalyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)

    def _get_now(self) -> datetime:
        return datetime.now(self._tz)

    def _get_today(self) -> date:
        return self._get_now().date()

    async def get_active_flags(self, user_id: uuid.UUID, limit: int = 50) -> List[AnomalyFlag]:
        """Fetch active (undismissed) anomaly flags for a user."""
        stmt = (
            select(AnomalyFlag)
            .where(
                AnomalyFlag.user_id == user_id,
                AnomalyFlag.is_dismissed == False
            )
            .order_by(
                # High severity first, then newest
                AnomalyFlag.severity == "high",
                AnomalyFlag.detected_at.desc()
            )
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def dismiss_flag(self, user_id: uuid.UUID, flag_id: uuid.UUID) -> bool:
        """Dismiss a specific anomaly flag."""
        stmt = select(AnomalyFlag).where(
            AnomalyFlag.id == flag_id,
            AnomalyFlag.user_id == user_id
        )
        res = await self.db.execute(stmt)
        flag = res.scalar_one_or_none()
        if not flag:
            return False

        flag.is_dismissed = True
        flag.dismissed_at = self._get_now()
        await self.db.commit()
        return True

    async def dismiss_all(self, user_id: uuid.UUID) -> int:
        """Dismiss all active flags for a user."""
        flags = await self.get_active_flags(user_id, limit=200)
        now = self._get_now()
        count = len(flags)
        for f in flags:
            f.is_dismissed = True
            f.dismissed_at = now
        await self.db.commit()
        return count

    async def scan_and_record_anomalies(self, user_id: uuid.UUID) -> Tuple[int, List[AnomalyFlag]]:
        """
        Runs all detector algorithms and records any newly identified anomalies into `anomaly_flags`.
        Returns (new_flags_count, current_active_flags).
        """
        today = self._get_today()
        now = self._get_now()
        candidate_flags: List[Dict[str, Any]] = []

        # 1. Fetch historical transactions for the user (last 180 days)
        cutoff_180d = today - timedelta(days=180)
        stmt = (
            select(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.status != TransactionStatus.REJECTED,
                Transaction.category != "Income",
                func.lower(Transaction.sub_category) != "credit card payment",
                Transaction.amount < 0,
                Transaction.transaction_date >= cutoff_180d
            )
            .order_by(Transaction.transaction_date.desc().nulls_last(), Transaction.created_at.desc())
        )
        res = await self.db.execute(stmt)
        transactions = list(res.scalars().all())

        if not transactions:
            active_flags = await self.get_active_flags(user_id)
            return 0, active_flags

        # Run Detectors
        # Detector A: Merchant Amount Spike
        candidate_flags.extend(self._detect_amount_spikes(transactions, today))

        # Detector B: Near-Duplicate Transactions
        candidate_flags.extend(self._detect_duplicates(transactions, today))

        # Detector C: Category Weekly Burn Spikes
        candidate_flags.extend(self._detect_category_burn(transactions, today))

        # Detector D: Recurring Cost Drift on Committed Sureties / Bills
        candidate_flags.extend(await self._detect_surety_drift(user_id, transactions, today))

        # Detector E: First-Time New Merchant High Spend
        candidate_flags.extend(await self._detect_new_merchant_high(user_id, transactions, today))

        # Detector F: Settle Up Aging Overdue
        candidate_flags.extend(await self._detect_settle_up_aging(user_id, today))

        # Save candidates without duplicating existing ones
        new_count = 0
        if candidate_flags:
            # Fetch existing dedup keys for this user
            dedup_keys = [c["dedup_key"] for c in candidate_flags]
            existing_stmt = select(AnomalyFlag.dedup_key).where(
                AnomalyFlag.user_id == user_id,
                AnomalyFlag.dedup_key.in_(dedup_keys)
            )
            existing_res = await self.db.execute(existing_stmt)
            existing_keys = set(existing_res.scalars().all())

            for c in candidate_flags:
                if c["dedup_key"] not in existing_keys:
                    flag = AnomalyFlag(
                        user_id=user_id,
                        anomaly_type=c["anomaly_type"],
                        severity=c["severity"],
                        title=c["title"],
                        description=c["description"],
                        transaction_id=c.get("transaction_id"),
                        merchant_name=c.get("merchant_name"),
                        category=c.get("category"),
                        amount=Decimal(str(c["amount"])) if c.get("amount") is not None else None,
                        expected_range=c.get("expected_range"),
                        dedup_key=c["dedup_key"],
                        is_dismissed=False
                    )
                    self.db.add(flag)
                    existing_keys.add(c["dedup_key"])
                    new_count += 1

            if new_count > 0:
                await self.db.commit()

        active_flags = await self.get_active_flags(user_id)
        return new_count, active_flags

    # =========================================================================
    # DETECTOR ALGORITHMS
    # =========================================================================

    def _detect_amount_spikes(self, transactions: List[Transaction], today: date) -> List[Dict[str, Any]]:
        """
        Flag transactions in the last 14 days whose amount is an extreme outlier
        relative to historical spending on that same merchant.
        """
        flags = []
        recent_cutoff = today - timedelta(days=14)

        # Group amounts by normalized merchant name
        merchant_history: Dict[str, List[Tuple[float, Transaction]]] = {}
        for t in transactions:
            m_name = (t.merchant_name or "").strip()
            if not m_name or len(m_name) < 2:
                continue
            key = m_name.lower()
            amt = abs(float(t.amount))
            if amt <= 0.01:
                continue
            if key not in merchant_history:
                merchant_history[key] = []
            merchant_history[key].append((amt, t))

        for key, records in merchant_history.items():
            if len(records) < 3:
                continue

            all_amounts = [r[0] for r in records]
            sample_size = len(all_amounts)
            display_merchant = records[0][1].merchant_name or key.title()

            mean = float(np.mean(all_amounts))
            std = float(np.std(all_amounts, ddof=1)) if sample_size > 1 else 0.0
            median = float(np.median(all_amounts))

            for amt, t in records:
                t_date = t.transaction_date or t.created_at.date()
                if t_date < recent_cutoff:
                    continue

                is_spike = False
                ratio = (amt / mean) if mean > 0 else 1.0

                if sample_size >= 5 and std > 0:
                    z_score = (amt - mean) / std
                    if z_score >= 2.5 and ratio >= 2.0 and (amt - mean) >= 400:
                        is_spike = True
                        severity = "high" if (z_score >= 3.5 or ratio >= 3.5 or amt >= 10000) else "medium"
                        flags.append({
                            "anomaly_type": "amount_spike",
                            "severity": severity,
                            "title": f"Unusual {display_merchant} Charge",
                            "description": f"₹{amt:,.0f} is {ratio:.1f}× your typical ₹{mean:,.0f} spent at {display_merchant} ({sample_size} past transactions)",
                            "transaction_id": t.id,
                            "merchant_name": display_merchant,
                            "category": t.category,
                            "amount": amt,
                            "expected_range": f"Typical: ₹{max(0, mean - std):,.0f} - ₹{mean + std:,.0f}",
                            "dedup_key": f"amount_spike:{t.id}"
                        })
                elif sample_size in (3, 4):
                    if amt >= median * 3.0 and (amt - median) >= 800:
                        is_spike = True
                        flags.append({
                            "anomaly_type": "amount_spike",
                            "severity": "medium",
                            "title": f"Unusual {display_merchant} Charge",
                            "description": f"₹{amt:,.0f} is ~{amt / median:.1f}× your previous median of ₹{median:,.0f} at {display_merchant}",
                            "transaction_id": t.id,
                            "merchant_name": display_merchant,
                            "category": t.category,
                            "amount": amt,
                            "expected_range": f"Past median: ~₹{median:,.0f}",
                            "dedup_key": f"amount_spike:{t.id}"
                        })

        return flags

    def _detect_duplicates(self, transactions: List[Transaction], today: date) -> List[Dict[str, Any]]:
        """
        Flag potential duplicate charges: identical or near-identical amounts at the same merchant
        within 48 hours of each other (last 14 days).
        """
        flags = []
        recent_cutoff = today - timedelta(days=14)
        recent_txns = [
            t for t in transactions 
            if (t.transaction_date or t.created_at.date()) >= recent_cutoff
        ]

        seen_pairs = set()

        for i, t1 in enumerate(recent_txns):
            amt1 = abs(float(t1.amount))
            if amt1 < 50:  # Skip trivial micro-charges
                continue
            m1 = (t1.merchant_name or "").strip().lower()
            d1 = t1.transaction_date or t1.created_at.date()

            for j in range(i + 1, len(recent_txns)):
                t2 = recent_txns[j]
                amt2 = abs(float(t2.amount))
                m2 = (t2.merchant_name or "").strip().lower()
                d2 = t2.transaction_date or t2.created_at.date()

                day_diff = abs((d1 - d2).days)
                if day_diff > 2:
                    continue

                # Same merchant and same or near-identical amount
                if m1 and m2 and m1 == m2 and abs(amt1 - amt2) <= 2.0:
                    pair_key = tuple(sorted([str(t1.id), str(t2.id)]))
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)

                    display_merchant = t1.merchant_name or m1.title()
                    severity = "high" if amt1 >= 1500 else "medium"
                    
                    flags.append({
                        "anomaly_type": "near_duplicate",
                        "severity": severity,
                        "title": f"Possible Duplicate: {display_merchant}",
                        "description": f"Two identical charges of ₹{amt1:,.0f} occurred at {display_merchant} within 48 hours ({d2.strftime('%d %b')} and {d1.strftime('%d %b')})",
                        "transaction_id": t1.id,
                        "merchant_name": display_merchant,
                        "category": t1.category,
                        "amount": amt1,
                        "expected_range": "1 charge expected",
                        "dedup_key": f"duplicate:{pair_key[0]}_{pair_key[1]}"
                    })

        return flags

    def _detect_category_burn(self, transactions: List[Transaction], today: date) -> List[Dict[str, Any]]:
        """
        Flag category-wide spending explosions: current rolling 7 days vs rolling 4-week weekly median.
        """
        flags = []
        seven_days_ago = today - timedelta(days=7)
        five_weeks_ago = today - timedelta(days=35)

        # Build daily series per category
        data = []
        for t in transactions:
            t_date = t.transaction_date or t.created_at.date()
            if t_date < five_weeks_ago:
                continue
            cat = (t.category or "General").strip().title()
            if cat in {"Income", "Investment", "Housing", "Transfer"}:
                continue
            amt = abs(float(t.amount))
            data.append({"date": t_date, "category": cat, "amount": amt})

        if not data:
            return flags

        df = pd.DataFrame(data)
        categories = df["category"].unique()

        iso_week_str = f"{today.isocalendar().year}-W{today.isocalendar().week}"

        for cat in categories:
            cat_df = df[df["category"] == cat]
            current_7d = cat_df[cat_df["date"] >= seven_days_ago]["amount"].sum()
            
            # Prior 4 weeks (days 7 to 35 ago, in 7-day chunks)
            prior_chunks = []
            for w in range(1, 5):
                start_w = today - timedelta(days=(w + 1) * 7)
                end_w = today - timedelta(days=w * 7)
                chunk_sum = cat_df[(cat_df["date"] >= start_w) & (cat_df["date"] < end_w)]["amount"].sum()
                prior_chunks.append(chunk_sum)

            if len(prior_chunks) < 2:
                continue

            median_weekly = float(np.median(prior_chunks))
            if median_weekly < 500:
                continue  # Ignore tiny baseline categories

            ratio = current_7d / median_weekly
            diff = current_7d - median_weekly

            if ratio >= 2.2 and diff >= 2500:
                severity = "high" if ratio >= 3.5 or diff >= 8000 else "medium"
                flags.append({
                    "anomaly_type": "category_burn",
                    "severity": severity,
                    "title": f"{cat} Spend Spike",
                    "description": f"You've spent ₹{current_7d:,.0f} on {cat} in the past 7 days — {ratio:.1f}× higher than your usual weekly median of ₹{median_weekly:,.0f}",
                    "transaction_id": None,
                    "merchant_name": None,
                    "category": cat,
                    "amount": current_7d,
                    "expected_range": f"Typical weekly: ~₹{median_weekly:,.0f}",
                    "dedup_key": f"category_burn:{cat.lower()}:{iso_week_str}"
                })

        return flags

    async def _detect_surety_drift(
        self,
        user_id: uuid.UUID,
        transactions: List[Transaction],
        today: date
    ) -> List[Dict[str, Any]]:
        """
        Flag recurring surety and committed obligations (SIP, rent, EMIs, utilities, subscriptions)
        whose price has drifted upward significantly compared to previous surety baseline or configured Bill schema.
        Driven entirely by schema definitions (SubCategory.is_surety, Transaction.is_surety, and Bill.is_recurring).
        """
        flags = []
        thirty_days_ago = today - timedelta(days=30)

        # 1. Fetch all surety sub-categories dynamically from the DB schema
        stmt_surety = select(func.lower(SubCategory.name)).where(SubCategory.is_surety == True)
        surety_res = await self.db.execute(stmt_surety)
        surety_subcategories = set(surety_res.scalars().all())

        # 2. Fetch user's registered recurring bills
        stmt_bills = select(Bill).where(Bill.user_id == user_id, Bill.is_recurring == True)
        bills_res = await self.db.execute(stmt_bills)
        recurring_bills = list(bills_res.scalars().all())
        bill_map = {
            (b.title or "").strip().lower(): b 
            for b in recurring_bills if b.title
        }

        # 3. Filter surety transactions based on domain schema
        surety_groups: Dict[str, List[Transaction]] = {}
        for t in transactions:
            sub_norm = (t.sub_category or "").strip().lower()
            m_norm = (t.merchant_name or "").strip().lower()

            is_surety_txn = (
                t.is_surety is True or 
                sub_norm in surety_subcategories or
                m_norm in bill_map
            )

            if is_surety_txn:
                key = m_norm or sub_norm or "surety"
                if key not in surety_groups:
                    surety_groups[key] = []
                surety_groups[key].append(t)

        for key, txns in surety_groups.items():
            if not txns:
                continue

            sorted_txns = sorted(txns, key=lambda x: (x.transaction_date or x.created_at.date()))
            latest_txn = sorted_txns[-1]
            latest_date = latest_txn.transaction_date or latest_txn.created_at.date()

            if latest_date < thirty_days_ago:
                continue

            latest_amt = abs(float(latest_txn.amount))
            display_name = latest_txn.merchant_name or latest_txn.sub_category or key.title()

            # Check A: Compare against registered Bill schema if matching
            matched_bill = bill_map.get(key)
            if matched_bill and matched_bill.amount:
                expected_bill_amt = float(matched_bill.amount)
                if expected_bill_amt > 50:
                    pct_over = ((latest_amt - expected_bill_amt) / expected_bill_amt) * 100.0
                    abs_over = latest_amt - expected_bill_amt
                    if pct_over >= 10.0 and abs_over >= 200:
                        flags.append({
                            "anomaly_type": "recurring_drift",
                            "severity": "high" if pct_over >= 25.0 else "medium",
                            "title": f"Surety Exceeded: {matched_bill.title}",
                            "description": f"Paid ₹{latest_amt:,.0f} vs configured bill budget of ₹{expected_bill_amt:,.0f} (+{pct_over:.0f}%)",
                            "transaction_id": latest_txn.id,
                            "merchant_name": latest_txn.merchant_name or matched_bill.title,
                            "category": latest_txn.category or matched_bill.category,
                            "amount": latest_amt,
                            "expected_range": f"Configured bill: ₹{expected_bill_amt:,.0f}",
                            "dedup_key": f"surety_bill_drift:{latest_txn.id}"
                        })
                        continue  # Bill comparison took precedence

            # Check B: Compare against historical surety baseline
            if len(sorted_txns) >= 2:
                prev_amts = [abs(float(t.amount)) for t in sorted_txns[:-1]]
                median_prev = float(np.median(prev_amts))
                if median_prev >= 200:
                    pct_drift = ((latest_amt - median_prev) / median_prev) * 100.0
                    abs_drift = latest_amt - median_prev

                    if pct_drift >= 12.0 and abs_drift >= 250:
                        flags.append({
                            "anomaly_type": "recurring_drift",
                            "severity": "medium",
                            "title": f"Surety Cost Jump: {display_name}",
                            "description": f"Committed surety increased from historical ₹{median_prev:,.0f} to ₹{latest_amt:,.0f} (+{pct_drift:.0f}%)",
                            "transaction_id": latest_txn.id,
                            "merchant_name": latest_txn.merchant_name,
                            "category": latest_txn.category,
                            "amount": latest_amt,
                            "expected_range": f"Previous baseline: ~₹{median_prev:,.0f}",
                            "dedup_key": f"recurring_drift:{latest_txn.id}"
                        })

        return flags

    async def _detect_new_merchant_high(
        self, 
        user_id: uuid.UUID, 
        transactions: List[Transaction], 
        today: date
    ) -> List[Dict[str, Any]]:
        """
        Flag first-time high-value transactions (>= ₹5,000) at merchants never seen before in user's history.
        """
        flags = []
        seven_days_ago = today - timedelta(days=7)

        # Candidates in the last 7 days with amount >= 5000
        candidates = [
            t for t in transactions
            if (t.transaction_date or t.created_at.date()) >= seven_days_ago
            and abs(float(t.amount)) >= 5000.0
            and (t.merchant_name or "").strip()
        ]

        if not candidates:
            return flags

        # Check all historical merchant names for this user older than 7 days
        stmt = (
            select(func.lower(func.trim(Transaction.merchant_name)))
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_date < seven_days_ago,
                Transaction.merchant_name.isnot(None)
            )
            .distinct()
        )
        res = await self.db.execute(stmt)
        known_merchants = set(res.scalars().all())

        for t in candidates:
            m_norm = (t.merchant_name or "").strip().lower()
            if m_norm not in known_merchants:
                amt = abs(float(t.amount))
                display_name = t.merchant_name.strip()
                severity = "high" if amt >= 15000 else "medium"
                flags.append({
                    "anomaly_type": "new_merchant_high",
                    "severity": severity,
                    "title": f"First-time High Spend: {display_name}",
                    "description": f"First recorded transaction with '{display_name}' for ₹{amt:,.0f}",
                    "transaction_id": t.id,
                    "merchant_name": display_name,
                    "category": t.category,
                    "amount": amt,
                    "expected_range": "First-time merchant",
                    "dedup_key": f"new_merchant:{t.id}"
                })

        return flags

    async def _detect_settle_up_aging(self, user_id: uuid.UUID, today: date) -> List[Dict[str, Any]]:
        """
        Flag peers with large outstanding debt (>= ₹10,000) that have had no transaction or reminder in > 30 days.
        """
        flags = []
        thirty_days_ago = today - timedelta(days=30)

        # Group SettleUp balances
        stmt = (
            select(
                SettleUpEntry.peer_name,
                func.sum(SettleUpEntry.amount).label("net_balance"),
                func.max(SettleUpEntry.date).label("last_activity")
            )
            .where(SettleUpEntry.user_id == user_id)
            .group_by(SettleUpEntry.peer_name)
            .having(func.sum(SettleUpEntry.amount) >= 10000)
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        month_str = today.strftime("%Y-%m")

        for row in rows:
            peer_name = row.peer_name
            net_bal = float(row.net_balance or 0)
            last_act = row.last_activity

            if last_act and last_act > thirty_days_ago:
                continue

            # Check contact last reminded date
            contact_stmt = select(SettleUpPeerContact).where(
                SettleUpPeerContact.user_id == user_id,
                func.lower(SettleUpPeerContact.peer_name) == peer_name.lower()
            )
            contact_res = await self.db.execute(contact_stmt)
            contact = contact_res.scalar_one_or_none()

            if contact and contact.last_reminded_at:
                reminded_date = contact.last_reminded_at.date()
                if reminded_date > thirty_days_ago:
                    continue

            severity = "high" if net_bal >= 25000 else "medium"
            flags.append({
                "anomaly_type": "settle_up_aging",
                "severity": severity,
                "title": f"Overdue Settle Up: {peer_name}",
                "description": f"{peer_name} owes you ₹{net_bal:,.0f} with no settlement activity in over 30 days",
                "transaction_id": None,
                "merchant_name": peer_name,
                "category": "Settle Up",
                "amount": net_bal,
                "expected_range": "Overdue (>30 days)",
                "dedup_key": f"settle_up_aging:{peer_name.lower()}:{month_str}"
            })

        return flags
