"""
Consolidated Financial Portfolio & Asset Statement Generator
Generates a multi-tab, professionally styled Excel workbook (.xlsx)
serving as an executive personal financial statement, asset schedule,
and institutional reference document.
"""

import io
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.features.wealth.models import InvestmentHolding, AssetType
from app.features.credit_cards.models import CreditCard
from app.features.bills.models import Bill
from app.features.auth.models import User


# Professional Typography & Colors
FONT_TITLE = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
FONT_SUBTITLE = Font(name="Calibri", size=10, italic=True, color="CBD5E1")
FONT_SECTION = Font(name="Calibri", size=11, bold=True, color="1E293B")
FONT_HEADER = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
FONT_DATA = Font(name="Calibri", size=10, color="0F172A")
FONT_DATA_BOLD = Font(name="Calibri", size=10, bold=True, color="0F172A")
FONT_MUTED = Font(name="Calibri", size=9, italic=True, color="64748B")
FONT_GAIN = Font(name="Calibri", size=10, bold=True, color="065F46")
FONT_LOSS = Font(name="Calibri", size=10, bold=True, color="991B1B")

FILL_NAVY = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
FILL_HEADER = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_TOTAL = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
FILL_INFO_BG = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
FILL_CARD_BG = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")
ALIGN_HEADER = Alignment(horizontal="center", vertical="center", wrap_text=True)

THIN_BORDER_SIDE = Side(border_style="thin", color="CBD5E1")
BORDER_CELL = Border(left=THIN_BORDER_SIDE, right=THIN_BORDER_SIDE, top=THIN_BORDER_SIDE, bottom=THIN_BORDER_SIDE)
BORDER_TOTAL = Border(
    left=THIN_BORDER_SIDE, 
    right=THIN_BORDER_SIDE, 
    top=Side(border_style="thin", color="0F172A"), 
    bottom=Side(border_style="double", color="0F172A")
)

FORMAT_CURRENCY = "₹#,##0.00"
FORMAT_PERCENT = "0.00%"
FORMAT_DATE = "YYYY-MM-DD"
FORMAT_INT = "#,##0"


def auto_fit_columns(ws, min_width=12, max_width=55):
    """Dynamically adjust column widths based on cell content length."""
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val = str(cell.value or "")
            if val:
                if len(val) > 80 and cell.row <= 3:
                    continue
                lines = val.split("\n")
                line_max = max(len(l) for l in lines)
                max_len = max(max_len, line_max)
        ws.column_dimensions[col_letter].width = max(min_width, min(max_len + 4, max_width))
    ws.views.sheetView[0].showGridLines = True


def build_banner(ws, title: str, subtitle: str, max_col: int = 12):
    """Render a clean, corporate top header banner."""
    max_col_letter = get_column_letter(max_col)
    
    ws.merge_cells(f"A1:{max_col_letter}1")
    cell_title = ws["A1"]
    cell_title.value = title
    cell_title.font = FONT_TITLE
    cell_title.fill = FILL_NAVY
    cell_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 34

    ws.merge_cells(f"A2:{max_col_letter}2")
    cell_sub = ws["A2"]
    cell_sub.value = subtitle
    cell_sub.font = FONT_SUBTITLE
    cell_sub.fill = FILL_NAVY
    cell_sub.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 20

    ws.row_dimensions[3].height = 10


def get_type_str(val) -> str:
    if hasattr(val, "value"):
        return str(val.value)
    return str(val or "")


def generate_portfolio_statement_workbook(
    user: User,
    holdings: List[InvestmentHolding],
    credit_cards: List[CreditCard],
    bills: List[Bill]
) -> io.BytesIO:
    """
    Builds the executive multi-sheet personal financial statement & asset schedule.
    """
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # Segregate holdings into financial asset classes
    deposits = [h for h in holdings if get_type_str(h.asset_type) in ["FD", "RD"]]
    market_assets = [h for h in holdings if get_type_str(h.asset_type) in ["MUTUAL_FUND", "STOCK", "SIP", "GOLD"]]
    govt_assets = [h for h in holdings if get_type_str(h.asset_type) in ["PF", "APY", "PLI", "GRATUITY", "OTHER", "REAL_ESTATE"]]

    user_display = getattr(user, "full_name", None) or user.email
    today_str = date.today().strftime("%d-%b-%Y")

    # --- SHEET 1: 📋 Executive Summary ---
    ws1 = wb.create_sheet(title="📋 Executive Summary")
    build_banner(
        ws1,
        title="GRIP — CONSOLIDATED FINANCIAL PORTFOLIO STATEMENT",
        subtitle=f"Personal Balance Sheet & Asset Schedule | Account Holder: {user_display} | As of {today_str}",
        max_col=8
    )

    # General Information Block
    ws1.cell(row=4, column=1, value="STATEMENT PROFILE & DETAILS").font = FONT_SECTION
    ws1.merge_cells("A4:H4")

    profile_items = [
        ("Account Holder", user_display, "Report Type", "Consolidated Net Worth Schedule"),
        ("Reporting Currency", "Indian Rupee (INR / ₹)", "Valuation Date", today_str),
        ("Total Assets Tracked", f"{len(holdings)} holdings across {len(deposits)} deposits, {len(market_assets)} market funds, {len(govt_assets)} schemes", "Liabilities Tracked", f"{len(credit_cards)} active credit accounts"),
    ]

    curr_row = 5
    for l1, v1, l2, v2 in profile_items:
        c_l1 = ws1.cell(row=curr_row, column=1, value=l1)
        c_l1.font = FONT_DATA_BOLD
        c_l1.fill = FILL_CARD_BG
        c_l1.border = BORDER_CELL
        
        c_v1 = ws1.cell(row=curr_row, column=2, value=v1)
        c_v1.font = FONT_DATA
        c_v1.fill = FILL_CARD_BG
        c_v1.border = BORDER_CELL
        ws1.merge_cells(start_row=curr_row, start_column=2, end_row=curr_row, end_column=4)
        for col in range(2, 5):
            ws1.cell(row=curr_row, column=col).border = BORDER_CELL

        c_l2 = ws1.cell(row=curr_row, column=5, value=l2)
        c_l2.font = FONT_DATA_BOLD
        c_l2.fill = FILL_CARD_BG
        c_l2.border = BORDER_CELL

        c_v2 = ws1.cell(row=curr_row, column=6, value=v2)
        c_v2.font = FONT_DATA
        c_v2.fill = FILL_CARD_BG
        c_v2.border = BORDER_CELL
        ws1.merge_cells(start_row=curr_row, start_column=6, end_row=curr_row, end_column=8)
        for col in range(6, 9):
            ws1.cell(row=curr_row, column=col).border = BORDER_CELL

        ws1.row_dimensions[curr_row].height = 20
        curr_row += 1

    curr_row += 1
    # Portfolio Summary Header
    ws1.cell(row=curr_row, column=1, value="CONSOLIDATED ASSET ALLOCATION & NET WORTH SCHEDULE").font = FONT_SECTION
    ws1.merge_cells(f"A{curr_row}:H{curr_row}")
    curr_row += 1

    summary_headers = ["Asset Category", "Holdings Count", "Total Cost Basis", "Current Valuation", "Net Gain / Accrued", "Return %", "Schedule Sheet"]
    for idx, h in enumerate(summary_headers, start=1):
        cell = ws1.cell(row=curr_row, column=idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_HEADER
        cell.border = BORDER_CELL
    ws1.row_dimensions[curr_row].height = 24
    curr_row += 1

    summary_data = [
        ("Bank Deposits (FD & RD)", len(deposits), sum(h.total_invested or 0 for h in deposits), sum(h.current_value or 0 for h in deposits), "See '🏦 Bank Deposits (FD & RD)'"),
        ("Mutual Funds & Equities", len(market_assets), sum(h.total_invested or 0 for h in market_assets), sum(h.current_value or 0 for h in market_assets), "See '📈 Mutual Funds & Stocks'"),
        ("Retirement & Govt Schemes", len(govt_assets), sum(h.total_invested or 0 for h in govt_assets), sum(h.current_value or 0 for h in govt_assets), "See '🛡️ Govt & Retirement'"),
        ("Credit Facilities & Cards", len(credit_cards), 0.0, 0.0, "See '💳 Credit Cards'"),
    ]

    start_sum_row = curr_row
    for label, count, inv, val, tab_ref in summary_data:
        gain = val - inv
        pct = (gain / inv) if inv > 0 else 0.0
        
        c1 = ws1.cell(row=curr_row, column=1, value=label)
        c1.font = FONT_DATA_BOLD
        c1.border = BORDER_CELL
        
        c2 = ws1.cell(row=curr_row, column=2, value=count)
        c2.font = FONT_DATA
        c2.alignment = ALIGN_CENTER
        c2.border = BORDER_CELL

        c3 = ws1.cell(row=curr_row, column=3, value=inv if inv > 0 else "-")
        c3.font = FONT_DATA
        c3.alignment = ALIGN_RIGHT
        c3.number_format = FORMAT_CURRENCY if inv > 0 else "@"
        c3.border = BORDER_CELL

        c4 = ws1.cell(row=curr_row, column=4, value=val if val > 0 else "-")
        c4.font = FONT_DATA_BOLD
        c4.alignment = ALIGN_RIGHT
        c4.number_format = FORMAT_CURRENCY if val > 0 else "@"
        c4.border = BORDER_CELL

        c5 = ws1.cell(row=curr_row, column=5, value=gain if inv > 0 else "-")
        c5.font = FONT_GAIN if gain >= 0 else FONT_LOSS
        c5.alignment = ALIGN_RIGHT
        c5.number_format = FORMAT_CURRENCY if inv > 0 else "@"
        c5.border = BORDER_CELL

        c6 = ws1.cell(row=curr_row, column=6, value=pct if inv > 0 else "-")
        c6.font = FONT_DATA
        c6.alignment = ALIGN_RIGHT
        c6.number_format = FORMAT_PERCENT if inv > 0 else "@"
        c6.border = BORDER_CELL

        c7 = ws1.cell(row=curr_row, column=7, value=tab_ref)
        c7.font = FONT_MUTED
        c7.alignment = ALIGN_LEFT
        c7.border = BORDER_CELL

        ws1.row_dimensions[curr_row].height = 20
        curr_row += 1

    # Total Row
    c_tot1 = ws1.cell(row=curr_row, column=1, value="CONSOLIDATED NET WORTH")
    c_tot1.font = FONT_DATA_BOLD
    c_tot1.fill = FILL_TOTAL
    c_tot1.border = BORDER_TOTAL

    c_tot2 = ws1.cell(row=curr_row, column=2, value=len(holdings))
    c_tot2.font = FONT_DATA_BOLD
    c_tot2.fill = FILL_TOTAL
    c_tot2.alignment = ALIGN_CENTER
    c_tot2.border = BORDER_TOTAL

    c_tot3 = ws1.cell(row=curr_row, column=3, value=f"=SUM(C{start_sum_row}:C{curr_row-1})")
    c_tot3.font = FONT_DATA_BOLD
    c_tot3.fill = FILL_TOTAL
    c_tot3.alignment = ALIGN_RIGHT
    c_tot3.number_format = FORMAT_CURRENCY
    c_tot3.border = BORDER_TOTAL

    c_tot4 = ws1.cell(row=curr_row, column=4, value=f"=SUM(D{start_sum_row}:D{curr_row-1})")
    c_tot4.font = FONT_DATA_BOLD
    c_tot4.fill = FILL_TOTAL
    c_tot4.alignment = ALIGN_RIGHT
    c_tot4.number_format = FORMAT_CURRENCY
    c_tot4.border = BORDER_TOTAL

    c_tot5 = ws1.cell(row=curr_row, column=5, value=f"=D{curr_row}-C{curr_row}")
    c_tot5.font = FONT_GAIN
    c_tot5.fill = FILL_TOTAL
    c_tot5.alignment = ALIGN_RIGHT
    c_tot5.number_format = FORMAT_CURRENCY
    c_tot5.border = BORDER_TOTAL

    c_tot6 = ws1.cell(row=curr_row, column=6, value=f"=E{curr_row}/C{curr_row}")
    c_tot6.font = FONT_DATA_BOLD
    c_tot6.fill = FILL_TOTAL
    c_tot6.alignment = ALIGN_RIGHT
    c_tot6.number_format = FORMAT_PERCENT
    c_tot6.border = BORDER_TOTAL

    c_tot7 = ws1.cell(row=curr_row, column=7, value="Full Portfolio")
    c_tot7.font = FONT_MUTED
    c_tot7.fill = FILL_TOTAL
    c_tot7.border = BORDER_TOTAL
    ws1.row_dimensions[curr_row].height = 22

    curr_row += 2
    # Administrative & Reference Notes Block
    ws1.cell(row=curr_row, column=1, value="PORTFOLIO NOTES & INSTITUTIONAL REFERENCES").font = FONT_SECTION
    ws1.merge_cells(f"A{curr_row}:H{curr_row}")
    curr_row += 1

    general_notes = [
        ("Institutional Coverage", "This statement compiles asset balances across scheduled commercial banks, registered asset management companies (AMCs), and sovereign social security agencies."),
        ("Valuation Methodology", "Fixed and recurring deposits reflect compounding interest accrual up to the report date. Market assets reflect closing Net Asset Values (NAV) published via AMFI."),
        ("Account Identification", "Folio numbers, deposit advice references, PRAN/UAN identifiers, and registered nominee allocations are documented in their respective schedule tabs."),
        ("Data Integrity & Confidentiality", "All asset valuations, deposit tenures, and institutional references are compiled directly from your Grip portfolio and active AMFI NAV market feeds.")
    ]

    for title, desc in general_notes:
        c_title = ws1.cell(row=curr_row, column=1, value=title)
        c_title.font = FONT_DATA_BOLD
        c_title.fill = FILL_INFO_BG
        c_title.border = BORDER_CELL
        ws1.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=2)

        c_desc = ws1.cell(row=curr_row, column=3, value=desc)
        c_desc.font = FONT_DATA
        c_desc.alignment = ALIGN_LEFT
        c_desc.fill = FILL_INFO_BG
        c_desc.border = BORDER_CELL
        ws1.merge_cells(start_row=curr_row, start_column=3, end_row=curr_row, end_column=8)

        for col in range(1, 9):
            ws1.cell(row=curr_row, column=col).border = BORDER_CELL
        ws1.row_dimensions[curr_row].height = 22
        curr_row += 1

    auto_fit_columns(ws1, min_width=14, max_width=60)


    # --- SHEET 2: 🏦 Bank Deposits (FD & RD) ---
    ws2 = wb.create_sheet(title="🏦 Bank Deposits (FD & RD)")
    build_banner(
        ws2,
        title="SCHEDULE OF FIXED & RECURRING DEPOSITS",
        subtitle="Term deposits held across banking institutions with interest rates, maturity schedules, and nominee allocations.",
        max_col=13
    )

    dep_headers = [
        "Sl.", "Bank / Institution", "Deposit Name", "Type", "Account / Ref #",
        "Principal Invested", "Current Value", "Accrued Interest", "Rate (% p.a.)",
        "Maturity Date", "Maturity Amount", "Registered Nominee", "Remarks / Notes"
    ]
    curr_row = 4
    for idx, h in enumerate(dep_headers, start=1):
        cell = ws2.cell(row=curr_row, column=idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_HEADER
        cell.border = BORDER_CELL
    ws2.row_dimensions[curr_row].height = 24
    curr_row += 1

    start_dep_row = curr_row
    for i, h in enumerate(deposits, start=1):
        fill = FILL_ZEBRA if i % 2 == 0 else PatternFill(fill_type=None)
        inv = h.total_invested or 0.0
        val = h.current_value or 0.0
        accrued = val - inv
        mat_date_str = h.maturity_date.strftime("%d-%b-%Y") if h.maturity_date else "N/A"
        
        row_vals = [
            (i, FONT_DATA, ALIGN_CENTER, None),
            (h.institution_name or "Scheduled Commercial Bank", FONT_DATA_BOLD, ALIGN_LEFT, None),
            (h.name, FONT_DATA, ALIGN_LEFT, None),
            (get_type_str(h.asset_type), FONT_DATA, ALIGN_CENTER, None),
            (h.account_number_or_folio or "On File / Branch Record", FONT_DATA, ALIGN_LEFT, None),
            (inv, FONT_DATA, ALIGN_RIGHT, FORMAT_CURRENCY),
            (val, FONT_DATA_BOLD, ALIGN_RIGHT, FORMAT_CURRENCY),
            (accrued, FONT_GAIN if accrued >= 0 else FONT_LOSS, ALIGN_RIGHT, FORMAT_CURRENCY),
            (f"{h.interest_rate:.2f}%" if h.interest_rate else "Standard Card Rate", FONT_DATA, ALIGN_CENTER, None),
            (mat_date_str, FONT_DATA, ALIGN_CENTER, None),
            (h.maturity_amount or val, FONT_DATA, ALIGN_RIGHT, FORMAT_CURRENCY if h.maturity_amount else None),
            (h.nominee_name or "Registered with Branch", FONT_DATA, ALIGN_LEFT, None),
            (h.remarks or "Primary Deposit Account", FONT_DATA, ALIGN_LEFT, None)
        ]

        for col_idx, (val_data, font, align, num_fmt) in enumerate(row_vals, start=1):
            cell_item = ws2.cell(row=curr_row, column=col_idx, value=val_data)
            cell_item.font = font
            cell_item.alignment = align
            cell_item.border = BORDER_CELL
            if fill.fill_type:
                cell_item.fill = fill
            if num_fmt:
                cell_item.number_format = num_fmt

        ws2.row_dimensions[curr_row].height = 20
        curr_row += 1

    # Total Row for Deposits
    if deposits:
        ws2.cell(row=curr_row, column=1, value="").fill = FILL_TOTAL
        c_tot = ws2.cell(row=curr_row, column=2, value="TOTAL TERM DEPOSITS")
        c_tot.font = FONT_DATA_BOLD
        c_tot.fill = FILL_TOTAL
        c_tot.border = BORDER_TOTAL
        for c in range(3, 6):
            ws2.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws2.cell(row=curr_row, column=c).border = BORDER_TOTAL

        c_inv = ws2.cell(row=curr_row, column=6, value=f"=SUM(F{start_dep_row}:F{curr_row-1})")
        c_inv.font = FONT_DATA_BOLD
        c_inv.alignment = ALIGN_RIGHT
        c_inv.number_format = FORMAT_CURRENCY
        c_inv.fill = FILL_TOTAL
        c_inv.border = BORDER_TOTAL

        c_val = ws2.cell(row=curr_row, column=7, value=f"=SUM(G{start_dep_row}:G{curr_row-1})")
        c_val.font = FONT_DATA_BOLD
        c_val.alignment = ALIGN_RIGHT
        c_val.number_format = FORMAT_CURRENCY
        c_val.fill = FILL_TOTAL
        c_val.border = BORDER_TOTAL

        c_acc = ws2.cell(row=curr_row, column=8, value=f"=G{curr_row}-F{curr_row}")
        c_acc.font = FONT_GAIN
        c_acc.alignment = ALIGN_RIGHT
        c_acc.number_format = FORMAT_CURRENCY
        c_acc.fill = FILL_TOTAL
        c_acc.border = BORDER_TOTAL

        for c in range(9, 14):
            ws2.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws2.cell(row=curr_row, column=c).border = BORDER_TOTAL
        ws2.row_dimensions[curr_row].height = 22

    auto_fit_columns(ws2, min_width=12, max_width=55)


    # --- SHEET 3: 📈 Mutual Funds & Equities ---
    ws3 = wb.create_sheet(title="📈 Mutual Funds & Stocks")
    build_banner(
        ws3,
        title="SCHEDULE OF MUTUAL FUNDS, STOCKS & SECURITIES",
        subtitle="Market-linked instruments with live AMFI NAV valuations, folio identifiers, and nominee details.",
        max_col=12
    )

    mf_headers = [
        "Sl.", "Asset Category", "Scheme / Security Name", "AMC / Platform", "Folio / DP ID",
        "Scheme Code / Ticker", "Cost Basis", "Current Valuation", "Absolute Gain", "Return %",
        "Registered Nominee", "Remarks / Notes"
    ]
    curr_row = 4
    for idx, h in enumerate(mf_headers, start=1):
        cell = ws3.cell(row=curr_row, column=idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_HEADER
        cell.border = BORDER_CELL
    ws3.row_dimensions[curr_row].height = 24
    curr_row += 1

    start_mf_row = curr_row
    for i, h in enumerate(market_assets, start=1):
        fill = FILL_ZEBRA if i % 2 == 0 else PatternFill(fill_type=None)
        inv = h.total_invested or 0.0
        val = h.current_value or 0.0
        gain = val - inv
        pct = (gain / inv) if inv > 0 else 0.0

        row_vals = [
            (i, FONT_DATA, ALIGN_CENTER, None),
            (get_type_str(h.asset_type), FONT_DATA, ALIGN_CENTER, None),
            (h.name, FONT_DATA_BOLD, ALIGN_LEFT, None),
            (h.institution_name or "AMFI Registered AMC", FONT_DATA, ALIGN_LEFT, None),
            (h.account_number_or_folio or "Consolidated Account Statement (CAS)", FONT_DATA, ALIGN_LEFT, None),
            (h.ticker_symbol or "Direct Scheme", FONT_DATA, ALIGN_CENTER, None),
            (inv, FONT_DATA, ALIGN_RIGHT, FORMAT_CURRENCY),
            (val, FONT_DATA_BOLD, ALIGN_RIGHT, FORMAT_CURRENCY),
            (gain, FONT_GAIN if gain >= 0 else FONT_LOSS, ALIGN_RIGHT, FORMAT_CURRENCY),
            (pct, FONT_DATA, ALIGN_RIGHT, FORMAT_PERCENT),
            (h.nominee_name or "Registered via AMC / MF Central", FONT_DATA, ALIGN_LEFT, None),
            (h.remarks or "Regular Portfolio Asset", FONT_DATA, ALIGN_LEFT, None)
        ]

        for col_idx, (val_data, font, align, num_fmt) in enumerate(row_vals, start=1):
            cell_item = ws3.cell(row=curr_row, column=col_idx, value=val_data)
            cell_item.font = font
            cell_item.alignment = align
            cell_item.border = BORDER_CELL
            if fill.fill_type:
                cell_item.fill = fill
            if num_fmt:
                cell_item.number_format = num_fmt

        ws3.row_dimensions[curr_row].height = 20
        curr_row += 1

    # Total Row for Market Assets
    if market_assets:
        ws3.cell(row=curr_row, column=1, value="").fill = FILL_TOTAL
        c_tot = ws3.cell(row=curr_row, column=2, value="TOTAL MARKET INVESTMENTS")
        c_tot.font = FONT_DATA_BOLD
        c_tot.fill = FILL_TOTAL
        c_tot.border = BORDER_TOTAL
        for c in range(3, 7):
            ws3.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws3.cell(row=curr_row, column=c).border = BORDER_TOTAL

        c_inv = ws3.cell(row=curr_row, column=7, value=f"=SUM(G{start_mf_row}:G{curr_row-1})")
        c_inv.font = FONT_DATA_BOLD
        c_inv.alignment = ALIGN_RIGHT
        c_inv.number_format = FORMAT_CURRENCY
        c_inv.fill = FILL_TOTAL
        c_inv.border = BORDER_TOTAL

        c_val = ws3.cell(row=curr_row, column=8, value=f"=SUM(H{start_mf_row}:H{curr_row-1})")
        c_val.font = FONT_DATA_BOLD
        c_val.alignment = ALIGN_RIGHT
        c_val.number_format = FORMAT_CURRENCY
        c_val.fill = FILL_TOTAL
        c_val.border = BORDER_TOTAL

        c_gain = ws3.cell(row=curr_row, column=9, value=f"=H{curr_row}-G{curr_row}")
        c_gain.font = FONT_GAIN
        c_gain.alignment = ALIGN_RIGHT
        c_gain.number_format = FORMAT_CURRENCY
        c_gain.fill = FILL_TOTAL
        c_gain.border = BORDER_TOTAL

        c_pct = ws3.cell(row=curr_row, column=10, value=f"=I{curr_row}/G{curr_row}")
        c_pct.font = FONT_DATA_BOLD
        c_pct.alignment = ALIGN_RIGHT
        c_pct.number_format = FORMAT_PERCENT
        c_pct.fill = FILL_TOTAL
        c_pct.border = BORDER_TOTAL

        for c in range(11, 13):
            ws3.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws3.cell(row=curr_row, column=c).border = BORDER_TOTAL
        ws3.row_dimensions[curr_row].height = 22

    auto_fit_columns(ws3, min_width=12, max_width=55)


    # --- SHEET 4: 🛡️ Retirement & Sovereign Schemes ---
    ws4 = wb.create_sheet(title="🛡️ Govt & Retirement")
    build_banner(
        ws4,
        title="SCHEDULE OF RETIREMENT & SOVEREIGN SCHEMES",
        subtitle="Social security, statutory pensions, postal life insurance, and provident fund accounts.",
        max_col=10
    )

    govt_headers = [
        "Sl.", "Scheme / Program Name", "Category", "Operating Authority", "PRAN / UAN / Policy #",
        "Total Contributions", "Accumulated Valuation", "Servicing Channel", "Registered Nominee", "Remarks / Notes"
    ]
    curr_row = 4
    for idx, h in enumerate(govt_headers, start=1):
        cell = ws4.cell(row=curr_row, column=idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_HEADER
        cell.border = BORDER_CELL
    ws4.row_dimensions[curr_row].height = 24
    curr_row += 1

    start_govt_row = curr_row
    for i, h in enumerate(govt_assets, start=1):
        fill = FILL_ZEBRA if i % 2 == 0 else PatternFill(fill_type=None)
        inv = h.total_invested or 0.0
        val = h.current_value or 0.0
        
        auth = "Government of India"
        channel = "Bank Branch / Online Portal"
        atype = get_type_str(h.asset_type)
        if atype == "APY":
            auth = "PFRDA / CRA-NSDL"
            channel = "Savings Account Servicing Branch"
        elif atype == "PLI":
            auth = "Department of Posts (India Post)"
            channel = "Head Post Office (HPO)"
        elif atype == "PF":
            auth = "Employees' Provident Fund Organisation (EPFO)"
            channel = "EPFO Member e-Sewa (UAN Portal)"

        row_vals = [
            (i, FONT_DATA, ALIGN_CENTER, None),
            (h.name, FONT_DATA_BOLD, ALIGN_LEFT, None),
            (atype, FONT_DATA, ALIGN_CENTER, None),
            (h.institution_name or auth, FONT_DATA, ALIGN_LEFT, None),
            (h.account_number_or_folio or "On File / Central Registry", FONT_DATA, ALIGN_LEFT, None),
            (inv, FONT_DATA, ALIGN_RIGHT, FORMAT_CURRENCY),
            (val, FONT_DATA_BOLD, ALIGN_RIGHT, FORMAT_CURRENCY),
            (channel, FONT_DATA, ALIGN_LEFT, None),
            (h.nominee_name or "Nomination on Master File", FONT_DATA, ALIGN_LEFT, None),
            (h.remarks or "Long-term Social Security", FONT_DATA, ALIGN_LEFT, None)
        ]

        for col_idx, (val_data, font, align, num_fmt) in enumerate(row_vals, start=1):
            cell_item = ws4.cell(row=curr_row, column=col_idx, value=val_data)
            cell_item.font = font
            cell_item.alignment = align
            cell_item.border = BORDER_CELL
            if fill.fill_type:
                cell_item.fill = fill
            if num_fmt:
                cell_item.number_format = num_fmt

        ws4.row_dimensions[curr_row].height = 20
        curr_row += 1

    # Total Row for Govt Assets
    if govt_assets:
        ws4.cell(row=curr_row, column=1, value="").fill = FILL_TOTAL
        c_tot = ws4.cell(row=curr_row, column=2, value="TOTAL RETIREMENT & SOVEREIGN CORPUS")
        c_tot.font = FONT_DATA_BOLD
        c_tot.fill = FILL_TOTAL
        c_tot.border = BORDER_TOTAL
        for c in range(3, 6):
            ws4.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws4.cell(row=curr_row, column=c).border = BORDER_TOTAL

        c_inv = ws4.cell(row=curr_row, column=6, value=f"=SUM(F{start_govt_row}:F{curr_row-1})")
        c_inv.font = FONT_DATA_BOLD
        c_inv.alignment = ALIGN_RIGHT
        c_inv.number_format = FORMAT_CURRENCY
        c_inv.fill = FILL_TOTAL
        c_inv.border = BORDER_TOTAL

        c_val = ws4.cell(row=curr_row, column=7, value=f"=SUM(G{start_govt_row}:G{curr_row-1})")
        c_val.font = FONT_DATA_BOLD
        c_val.alignment = ALIGN_RIGHT
        c_val.number_format = FORMAT_CURRENCY
        c_val.fill = FILL_TOTAL
        c_val.border = BORDER_TOTAL

        for c in range(8, 11):
            ws4.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws4.cell(row=curr_row, column=c).border = BORDER_TOTAL
        ws4.row_dimensions[curr_row].height = 22

    auto_fit_columns(ws4, min_width=12, max_width=55)


    # --- SHEET 5: 💳 Credit Cards & Revolving Credit ---
    ws5 = wb.create_sheet(title="💳 Credit Cards")
    build_banner(
        ws5,
        title="SCHEDULE OF CREDIT CARDS & CREDIT FACILITIES",
        subtitle="Active revolving credit lines, credit limits, billing dates, and banking customer care contacts.",
        max_col=8
    )

    card_headers = [
        "Sl.", "Card Issuer & Name", "Last 4 Digits", "Credit Limit",
        "Statement Day", "Payment Due Day", "Status", "Bank Support Contact"
    ]
    curr_row = 4
    for idx, h in enumerate(card_headers, start=1):
        cell = ws5.cell(row=curr_row, column=idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_HEADER
        cell.border = BORDER_CELL
    ws5.row_dimensions[curr_row].height = 24
    curr_row += 1

    start_card_row = curr_row
    for i, c in enumerate(credit_cards, start=1):
        fill = FILL_ZEBRA if i % 2 == 0 else PatternFill(fill_type=None)
        
        helpline = "Customer care number printed on card reverse"
        if "axis" in c.card_name.lower():
            helpline = "Axis Bank: 1800-419-5959"
        elif "icici" in c.card_name.lower():
            helpline = "ICICI Bank: 1800-1080"
        elif "tata" in c.card_name.lower() or "hdfc" in c.card_name.lower():
            helpline = "HDFC / Tata Neu: 1800-202-6161"

        row_vals = [
            (i, FONT_DATA, ALIGN_CENTER, None),
            (c.card_name, FONT_DATA_BOLD, ALIGN_LEFT, None),
            (f"•••• {c.last_four_digits}" if c.last_four_digits else "N/A", FONT_DATA, ALIGN_CENTER, None),
            (float(c.credit_limit or 0), FONT_DATA, ALIGN_RIGHT, FORMAT_CURRENCY),
            (f"Day {c.statement_date} of month", FONT_DATA, ALIGN_CENTER, None),
            (f"Day {c.payment_due_date} of month", FONT_DATA, ALIGN_CENTER, None),
            ("Active" if c.is_active else "Inactive", FONT_DATA, ALIGN_CENTER, None),
            (helpline, FONT_DATA, ALIGN_LEFT, None)
        ]

        for col_idx, (val_data, font, align, num_fmt) in enumerate(row_vals, start=1):
            cell_item = ws5.cell(row=curr_row, column=col_idx, value=val_data)
            cell_item.font = font
            cell_item.alignment = align
            cell_item.border = BORDER_CELL
            if fill.fill_type:
                cell_item.fill = fill
            if num_fmt:
                cell_item.number_format = num_fmt

        ws5.row_dimensions[curr_row].height = 20
        curr_row += 1

    # Total Credit Limit
    if credit_cards:
        ws5.cell(row=curr_row, column=1, value="").fill = FILL_TOTAL
        c_tot = ws5.cell(row=curr_row, column=2, value="TOTAL REVOLVING CREDIT LIMIT")
        c_tot.font = FONT_DATA_BOLD
        c_tot.fill = FILL_TOTAL
        c_tot.border = BORDER_TOTAL
        ws5.cell(row=curr_row, column=3, value="").fill = FILL_TOTAL
        ws5.cell(row=curr_row, column=3).border = BORDER_TOTAL

        c_lim = ws5.cell(row=curr_row, column=4, value=f"=SUM(D{start_card_row}:D{curr_row-1})")
        c_lim.font = FONT_DATA_BOLD
        c_lim.alignment = ALIGN_RIGHT
        c_lim.number_format = FORMAT_CURRENCY
        c_lim.fill = FILL_TOTAL
        c_lim.border = BORDER_TOTAL

        for c in range(5, 9):
            ws5.cell(row=curr_row, column=c, value="").fill = FILL_TOTAL
            ws5.cell(row=curr_row, column=c).border = BORDER_TOTAL
        ws5.row_dimensions[curr_row].height = 22

    auto_fit_columns(ws5, min_width=12, max_width=55)


    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
