import csv
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.features.transactions.models import Transaction
from app.features.credit_cards.models import CreditCard
from app.features.bills.models import Bill
from app.features.wealth.models import InvestmentHolding

async def generate_csv_export(db: AsyncSession, user_id: str) -> str:
    """
    Generates a CSV string containing all transaction data for the user.
    """
    stmt = select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.transaction_date.desc())
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Date", "Amount", "Currency", "Merchant", "Category", 
        "Sub Category", "Account Type", "Status", "Is Manual", "Remarks", "Tags"
    ])

    for t in transactions:
        writer.writerow([
            t.transaction_date.isoformat() if t.transaction_date else "",
            t.amount,
            t.currency,
            t.merchant_name or "",
            t.category,
            t.sub_category,
            t.account_type,
            t.status,
            "Yes" if t.is_manual else "No",
            t.remarks or "",
            ",".join(t.tags) if t.tags else ""
        ])
    
    return output.getvalue()


async def generate_portfolio_statement_excel(db: AsyncSession, user) -> io.BytesIO:
    """
    Fetches all investment holdings, credit cards, and bills for the user,
    and generates the comprehensive personal financial portfolio statement workbook.
    """
    from sqlalchemy.orm import selectinload
    from app.features.wealth.models import InvestmentHolding
    from app.features.credit_cards.models import CreditCard
    from app.features.bills.models import Bill
    from app.features.export.portfolio_statement import generate_portfolio_statement_workbook

    # 1. Fetch Investment Holdings with snapshots
    holdings_stmt = (
        select(InvestmentHolding)
        .where(InvestmentHolding.user_id == user.id)
        .options(selectinload(InvestmentHolding.snapshots))
        .order_by(InvestmentHolding.asset_type, InvestmentHolding.name)
    )
    holdings_res = await db.execute(holdings_stmt)
    holdings = holdings_res.scalars().all()

    # 2. Fetch Credit Cards
    cards_stmt = (
        select(CreditCard)
        .where(CreditCard.user_id == user.id)
        .order_by(CreditCard.card_name)
    )
    cards_res = await db.execute(cards_stmt)
    credit_cards = cards_res.scalars().all()

    # 3. Fetch Bills
    bills_stmt = (
        select(Bill)
        .where(Bill.user_id == user.id)
        .order_by(Bill.due_date)
    )
    bills_res = await db.execute(bills_stmt)
    bills = bills_res.scalars().all()

    # 4. Fetch Settle Up / Peer Ledgers
    from app.features.settle_up.models import SettleUpEntry
    settle_up_stmt = (
        select(SettleUpEntry)
        .where(SettleUpEntry.user_id == user.id)
        .order_by(SettleUpEntry.date.desc())
    )
    settle_up_res = await db.execute(settle_up_stmt)
    settle_up_entries = settle_up_res.scalars().all()

    return generate_portfolio_statement_workbook(
        user=user,
        holdings=holdings,
        credit_cards=credit_cards,
        bills=bills,
        settle_up_entries=settle_up_entries
    )


def generate_transactions_excel(transactions: list, user_name: str) -> io.BytesIO:
    """
    Generates a corporate, multi-tab Excel workbook (.xlsx) containing:
    1. Weekly Recap (Last 7 Days)
    2. Complete Transaction History
    3. Category Spending Breakdown
    """
    from datetime import date, timedelta
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    font_title = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    font_sub = Font(name="Calibri", size=10, italic=True, color="CBD5E1")
    font_section = Font(name="Calibri", size=11, bold=True, color="1E293B")
    font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_data = Font(name="Calibri", size=10, color="0F172A")
    font_data_bold = Font(name="Calibri", size=10, bold=True, color="0F172A")
    font_muted = Font(name="Calibri", size=9, italic=True, color="64748B")
    font_green = Font(name="Calibri", size=10, bold=True, color="065F46")
    font_red = Font(name="Calibri", size=10, bold=True, color="991B1B")

    fill_navy = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    fill_header = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_total = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    fill_card = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")
    align_header = Alignment(horizontal="center", vertical="center", wrap_text=True)

    border_side = Side(border_style="thin", color="CBD5E1")
    border_cell = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)
    border_total = Border(
        left=border_side, right=border_side,
        top=Side(border_style="thin", color="0F172A"),
        bottom=Side(border_style="double", color="0F172A")
    )

    fmt_currency = "₹#,##0.00"

    def auto_fit(ws, min_w=12, max_w=50):
        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = 0
            for cell in col:
                val = str(cell.value or "")
                if val and cell.row > 2:
                    lines = val.split("\n")
                    max_len = max(max_len, max(len(l) for l in lines))
            ws.column_dimensions[col_letter].width = max(min_w, min(max_len + 4, max_w))
        ws.views.sheetView[0].showGridLines = True

    today = date.today()
    seven_days_ago = today - timedelta(days=7)

    # Filter weekly transactions
    weekly_txns = [
        t for t in transactions
        if t.transaction_date and t.transaction_date >= seven_days_ago
    ]

    headers = [
        "Date", "Merchant / Beneficiary", "Category", "Sub-Category",
        "Account", "Flow", "Amount (₹)", "Status", "Remarks", "Tags"
    ]

    # --- SHEET 1: 📅 Weekly Transactions (Last 7 Days) ---
    ws_week = wb.create_sheet(title="📅 Weekly Transactions")
    max_col_letter = get_column_letter(len(headers))

    ws_week.merge_cells(f"A1:{max_col_letter}1")
    c_title = ws_week["A1"]
    c_title.value = f"GRIP — WEEKLY TRANSACTIONS RECAP ({seven_days_ago.strftime('%d %b')} – {today.strftime('%d %b %Y')})"
    c_title.font = font_title
    c_title.fill = fill_navy
    c_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_week.row_dimensions[1].height = 32

    ws_week.merge_cells(f"A2:{max_col_letter}2")
    c_sub = ws_week["A2"]
    c_sub.value = f"Account Holder: {user_name} | Generated on {today.strftime('%d %b %Y')}"
    c_sub.font = font_sub
    c_sub.fill = fill_navy
    c_sub.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_week.row_dimensions[2].height = 20
    ws_week.row_dimensions[3].height = 10

    # Summary row
    week_debit = sum(abs(float(t.amount)) for t in weekly_txns if float(t.amount or 0) < 0)
    week_credit = sum(float(t.amount) for t in weekly_txns if float(t.amount or 0) > 0)
    net_flow = week_credit - week_debit

    ws_week.cell(row=4, column=1, value="WEEKLY SUMMARY").font = font_section
    ws_week.merge_cells("A4:B4")
    c_deb = ws_week.cell(row=4, column=3, value=f"Total Debits: ₹{week_debit:,.2f}")
    c_deb.font = font_red
    c_cred = ws_week.cell(row=4, column=5, value=f"Total Credits: ₹{week_credit:,.2f}")
    c_cred.font = font_green
    c_net = ws_week.cell(row=4, column=7, value=f"Net Flow: ₹{net_flow:,.2f}")
    c_net.font = font_green if net_flow >= 0 else font_red

    # Headers
    row_idx = 6
    for c_idx, h in enumerate(headers, start=1):
        cell = ws_week.cell(row=row_idx, column=c_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_header
        cell.border = border_cell
    ws_week.row_dimensions[row_idx].height = 24
    row_idx += 1

    start_w_row = row_idx
    if not weekly_txns:
        c_emp = ws_week.cell(row=row_idx, column=1, value="No transactions recorded in the past 7 days.")
        c_emp.font = font_muted
        ws_week.merge_cells(f"A{row_idx}:{max_col_letter}{row_idx}")
        row_idx += 1
    else:
        for idx, t in enumerate(weekly_txns, start=1):
            fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)
            amt = float(t.amount or 0)
            is_credit = amt > 0
            flow_label = "Credit (+)" if is_credit else "Debit (-)"
            amt_font = font_green if is_credit else font_red
            date_val = t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else "—"

            vals = [
                (date_val, font_data, align_center, None),
                (t.merchant_name or "—", font_data_bold, align_left, None),
                (t.category or "—", font_data, align_left, None),
                (t.sub_category or "—", font_data, align_left, None),
                (str(t.account_type or "—"), font_data, align_center, None),
                (flow_label, amt_font, align_center, None),
                (amt, amt_font, align_right, fmt_currency),
                (str(t.status or "VERIFIED"), font_muted, align_center, None),
                (t.remarks or "—", font_data, align_left, None),
                (", ".join(t.tags) if t.tags else "—", font_muted, align_left, None)
            ]
            for col_i, (v, f, a, nf) in enumerate(vals, start=1):
                c = ws_week.cell(row=row_idx, column=col_i, value=v)
                c.font = f
                c.alignment = a
                c.border = border_cell
                if fill.fill_type:
                    c.fill = fill
                if nf:
                    c.number_format = nf
            ws_week.row_dimensions[row_idx].height = 20
            row_idx += 1

        # Total row
        ws_week.cell(row=row_idx, column=1, value="TOTAL WEEKLY TRANSACTIONS").fill = fill_total
        ws_week.cell(row=row_idx, column=1).font = font_data_bold
        ws_week.cell(row=row_idx, column=1).border = border_total
        ws_week.merge_cells(f"A{row_idx}:F{row_idx}")
        for c_i in range(1, 7):
            ws_week.cell(row=row_idx, column=c_i).border = border_total
            ws_week.cell(row=row_idx, column=c_i).fill = fill_total

        c_tot = ws_week.cell(row=row_idx, column=7, value=f"=SUM(G{start_w_row}:G{row_idx-1})")
        c_tot.font = font_data_bold
        c_tot.alignment = align_right
        c_tot.number_format = fmt_currency
        c_tot.fill = fill_total
        c_tot.border = border_total

        for c_i in range(8, len(headers) + 1):
            ws_week.cell(row=row_idx, column=c_i, value="").fill = fill_total
            ws_week.cell(row=row_idx, column=c_i).border = border_total
        ws_week.row_dimensions[row_idx].height = 22

    auto_fit(ws_week)

    # --- SHEET 2: 📁 Complete History ---
    ws_all = wb.create_sheet(title="📁 Complete History")
    ws_all.merge_cells(f"A1:{max_col_letter}1")
    c_title2 = ws_all["A1"]
    c_title2.value = f"GRIP — COMPLETE TRANSACTION HISTORY ({len(transactions)} Records)"
    c_title2.font = font_title
    c_title2.fill = fill_navy
    c_title2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_all.row_dimensions[1].height = 32

    ws_all.merge_cells(f"A2:{max_col_letter}2")
    c_sub2 = ws_all["A2"]
    c_sub2.value = f"Account Holder: {user_name} | Full historical ledger export"
    c_sub2.font = font_sub
    c_sub2.fill = fill_navy
    c_sub2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_all.row_dimensions[2].height = 20
    ws_all.row_dimensions[3].height = 10

    row_idx = 4
    for c_idx, h in enumerate(headers, start=1):
        cell = ws_all.cell(row=row_idx, column=c_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_header
        cell.border = border_cell
    ws_all.row_dimensions[row_idx].height = 24
    row_idx += 1

    start_all_row = row_idx
    for idx, t in enumerate(transactions, start=1):
        fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)
        amt = float(t.amount or 0)
        is_credit = amt > 0
        flow_label = "Credit (+)" if is_credit else "Debit (-)"
        amt_font = font_green if is_credit else font_red
        date_val = t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else "—"

        vals = [
            (date_val, font_data, align_center, None),
            (t.merchant_name or "—", font_data_bold, align_left, None),
            (t.category or "—", font_data, align_left, None),
            (t.sub_category or "—", font_data, align_left, None),
            (str(t.account_type or "—"), font_data, align_center, None),
            (flow_label, amt_font, align_center, None),
            (amt, amt_font, align_right, fmt_currency),
            (str(t.status or "VERIFIED"), font_muted, align_center, None),
            (t.remarks or "—", font_data, align_left, None),
            (", ".join(t.tags) if t.tags else "—", font_muted, align_left, None)
        ]
        for col_i, (v, f, a, nf) in enumerate(vals, start=1):
            c = ws_all.cell(row=row_idx, column=col_i, value=v)
            c.font = f
            c.alignment = a
            c.border = border_cell
            if fill.fill_type:
                c.fill = fill
            if nf:
                c.number_format = nf
        ws_all.row_dimensions[row_idx].height = 20
        row_idx += 1

    auto_fit(ws_all)

    # --- SHEET 3: 📊 Category Breakdown (Week) ---
    ws_cat = wb.create_sheet(title="📊 Category Breakdown")
    cat_headers = ["Category", "Transaction Count", "Total Debit (₹)", "Total Credit (₹)", "Net Spend (₹)"]
    max_cat_letter = get_column_letter(len(cat_headers))

    ws_cat.merge_cells(f"A1:{max_cat_letter}1")
    c_cat_t = ws_cat["A1"]
    c_cat_t.value = "GRIP — WEEKLY CATEGORY SPENDING BREAKDOWN"
    c_cat_t.font = font_title
    c_cat_t.fill = fill_navy
    c_cat_t.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_cat.row_dimensions[1].height = 32

    ws_cat.merge_cells(f"A2:{max_cat_letter}2")
    c_cat_s = ws_cat["A2"]
    c_cat_s.value = f"Past 7 Days summary | Account Holder: {user_name}"
    c_cat_s.font = font_sub
    c_cat_s.fill = fill_navy
    c_cat_s.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_cat.row_dimensions[2].height = 20
    ws_cat.row_dimensions[3].height = 10

    row_idx = 4
    for c_idx, h in enumerate(cat_headers, start=1):
        cell = ws_cat.cell(row=row_idx, column=c_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_header
        cell.border = border_cell
    ws_cat.row_dimensions[row_idx].height = 24
    row_idx += 1

    from collections import defaultdict
    cat_data = defaultdict(lambda: {"count": 0, "debit": 0.0, "credit": 0.0})
    for t in weekly_txns:
        cat_name = t.category or "Uncategorized"
        amt = float(t.amount or 0)
        cat_data[cat_name]["count"] += 1
        if amt < 0:
            cat_data[cat_name]["debit"] += abs(amt)
        else:
            cat_data[cat_name]["credit"] += amt

    sorted_cats = sorted(cat_data.items(), key=lambda x: x[1]["debit"], reverse=True)
    start_cat_row = row_idx
    for idx, (cat_name, d) in enumerate(sorted_cats, start=1):
        fill = fill_zebra if idx % 2 == 0 else PatternFill(fill_type=None)
        net_cat = d["debit"] - d["credit"]
        row_vals = [
            (cat_name, font_data_bold, align_left, None),
            (d["count"], font_data, align_center, None),
            (d["debit"], font_red, align_right, fmt_currency),
            (d["credit"], font_green, align_right, fmt_currency),
            (net_cat, font_data_bold, align_right, fmt_currency)
        ]
        for col_i, (v, f, a, nf) in enumerate(row_vals, start=1):
            c = ws_cat.cell(row=row_idx, column=col_i, value=v)
            c.font = f
            c.alignment = a
            c.border = border_cell
            if fill.fill_type:
                c.fill = fill
            if nf:
                c.number_format = nf
        ws_cat.row_dimensions[row_idx].height = 20
        row_idx += 1

    if sorted_cats:
        ws_cat.cell(row=row_idx, column=1, value="TOTAL").fill = fill_total
        ws_cat.cell(row=row_idx, column=1).font = font_data_bold
        ws_cat.cell(row=row_idx, column=1).border = border_total

        ws_cat.cell(row=row_idx, column=2, value=f"=SUM(B{start_cat_row}:B{row_idx-1})").fill = fill_total
        ws_cat.cell(row=row_idx, column=2).font = font_data_bold
        ws_cat.cell(row=row_idx, column=2).alignment = align_center
        ws_cat.cell(row=row_idx, column=2).border = border_total

        ws_cat.cell(row=row_idx, column=3, value=f"=SUM(C{start_cat_row}:C{row_idx-1})").fill = fill_total
        ws_cat.cell(row=row_idx, column=3).font = font_red
        ws_cat.cell(row=row_idx, column=3).alignment = align_right
        ws_cat.cell(row=row_idx, column=3).number_format = fmt_currency
        ws_cat.cell(row=row_idx, column=3).border = border_total

        ws_cat.cell(row=row_idx, column=4, value=f"=SUM(D{start_cat_row}:D{row_idx-1})").fill = fill_total
        ws_cat.cell(row=row_idx, column=4).font = font_green
        ws_cat.cell(row=row_idx, column=4).alignment = align_right
        ws_cat.cell(row=row_idx, column=4).number_format = fmt_currency
        ws_cat.cell(row=row_idx, column=4).border = border_total

        ws_cat.cell(row=row_idx, column=5, value=f"=C{row_idx}-D{row_idx}").fill = fill_total
        ws_cat.cell(row=row_idx, column=5).font = font_data_bold
        ws_cat.cell(row=row_idx, column=5).alignment = align_right
        ws_cat.cell(row=row_idx, column=5).number_format = fmt_currency
        ws_cat.cell(row=row_idx, column=5).border = border_total
        ws_cat.row_dimensions[row_idx].height = 22

    auto_fit(ws_cat)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


