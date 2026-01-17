from enum import Enum

class Category(str, Enum):
    HOUSING = "Housing"
    BILLS_UTILITIES = "Bills & Utilities"
    FOOD_DINING = "Food & Dining"
    TRANSPORT = "Transport"
    INVESTMENT = "Investment"
    SHOPPING = "Shopping"
    LEISURE = "Leisure"
    HEALTH_CARE = "Health Care"
    SOCIAL_GIVING = "Social & Giving"
    DEBT_CC = "Debt & CC"
    INCOME = "Income"
    UNCATEGORIZED = "Uncategorized"

class SubCategory(str, Enum):
    # Housing
    RENT = "Rent"
    MAINTENANCE = "Maintenance"
    HOME_IMPROVEMENT = "Home Improvement"
    
    # Bills & Utilities
    ELECTRICITY = "Electricity"
    WATER = "Water"
    INTERNET = "Internet"
    MOBILE_RECHARGE = "Mobile Recharge"
    GAS = "Gas / LPG"
    
    # Food & Dining
    GROCERIES = "Groceries"
    RESTAURANTS = "Restaurants"
    COFFEE = "Coffee"
    DELIVERY = "Delivery"
    
    # Transport
    FUEL = "Fuel"
    PUBLIC_TRANSPORT = "Public Transport"
    RIDE_SHARING = "Ride Sharing"
    SERVICE = "Service"
    
    # Investment
    SIP = "SIP"
    MUTUAL_FUNDS = "Mutual Funds"
    FIXED_DEPOSIT = "Fixed Deposit (FD)"
    RECURRING_DEPOSIT = "Recurring Deposit (RD)"
    STOCKS = "Stocks"
    
    # Shopping
    CLOTHING = "Clothing"
    ELECTRONICS = "Electronics"
    PERSONAL_CARE = "Personal Care"
    
    # Leisure
    TRAVEL = "Travel"
    MOVIES = "Movies"
    SUBSCRIPTIONS = "Subscriptions"
    HOBBIES = "Hobbies"

    # Health Care
    MEDICAL = "Medical"
    PHARMACY = "Pharmacy"
    HOSPITAL = "Hospital"
    HEALTH_INSURANCE = "Health Insurance"

    # Social & Giving
    GIFT = "Gift"
    DONATION = "Donation"
    CHARITY = "Charity"
    
    # Debt & CC
    CREDIT_CARD_PAYMENT = "Credit Card Payment"
    LOAN_EMI = "Loan EMI"
    P2P_LOAN_OUT = "P2P Loan Out"
    
    # Income
    SALARY = "Salary"
    FREELANCE = "Freelance"
    INTEREST = "Interest"
    P2P_RECEIVE = "P2P Receive"
    UNCATEGORIZED = "Uncategorized"

class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class AccountType(str, Enum):
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    CASH = "CASH"

# Centralized mapping to avoid modifying service files
CATEGORY_MAP = {
    Category.HOUSING: [
        SubCategory.RENT, 
        SubCategory.MAINTENANCE, 
        SubCategory.HOME_IMPROVEMENT
    ],
    Category.BILLS_UTILITIES: [
        SubCategory.ELECTRICITY,
        SubCategory.WATER,
        SubCategory.INTERNET,
        SubCategory.MOBILE_RECHARGE,
        SubCategory.GAS
    ],
    Category.FOOD_DINING: [
        SubCategory.GROCERIES,
        SubCategory.RESTAURANTS,
        SubCategory.COFFEE,
        SubCategory.DELIVERY
    ],
    Category.TRANSPORT: [
        SubCategory.FUEL,
        SubCategory.PUBLIC_TRANSPORT,
        SubCategory.RIDE_SHARING,
        SubCategory.SERVICE
    ],
    Category.INVESTMENT: [
        SubCategory.SIP,
        SubCategory.MUTUAL_FUNDS,
        SubCategory.FIXED_DEPOSIT,
        SubCategory.RECURRING_DEPOSIT,
        SubCategory.STOCKS
    ],
    Category.SHOPPING: [
        SubCategory.CLOTHING,
        SubCategory.ELECTRONICS,
        SubCategory.PERSONAL_CARE
    ],
    Category.LEISURE: [
        SubCategory.TRAVEL,
        SubCategory.MOVIES,
        SubCategory.SUBSCRIPTIONS,
        SubCategory.HOBBIES
    ],
    Category.HEALTH_CARE: [
        SubCategory.MEDICAL,
        SubCategory.PHARMACY,
        SubCategory.HOSPITAL,
        SubCategory.HEALTH_INSURANCE
    ],
    Category.SOCIAL_GIVING: [
        SubCategory.GIFT,
        SubCategory.DONATION,
        SubCategory.CHARITY
    ],
    Category.DEBT_CC: [
        SubCategory.CREDIT_CARD_PAYMENT,
        SubCategory.LOAN_EMI,
        SubCategory.P2P_LOAN_OUT
    ],
    Category.INCOME: [
        SubCategory.SALARY,
        SubCategory.FREELANCE,
        SubCategory.INTEREST,
        SubCategory.P2P_RECEIVE
    ],
    Category.UNCATEGORIZED: [
        SubCategory.UNCATEGORIZED
    ]
}
