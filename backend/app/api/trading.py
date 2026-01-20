# backend/app/api/trading.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.exc import NoResultFound  # optional, for better errors
from .models import User, Portfolio  # remove Trade if not used here
from .dependencies import get_current_user, get_db

router = APIRouter(prefix="/trading", tags=["trading"])

# Mock prices – later replace with external API call
MOCK_PRICES = {
    "BTC": 65000.0,
    "ETH": 3200.0,
    "SOL": 180.0,
    # Add more as your simulator supports them
}

class PortfolioAsset(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    current_price: float
    current_value: float
    pnl: float  # percentage

class PortfolioResponse(BaseModel):
    assets: List[PortfolioAsset]
    total_value: float
    updated_at: datetime

@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()

    if not portfolios:
        return PortfolioResponse(
            assets=[],
            total_value=0.0,
            updated_at=datetime.utcnow()
        )

    assets = []
    total_value = 0.0

    for p in portfolios:
        current_price = MOCK_PRICES.get(p.asset_symbol.upper(), 0.0)  # case-insensitive
        current_value = p.quantity * current_price
        cost_basis = p.quantity * p.avg_buy_price

        pnl = 0.0
        if cost_basis != 0:  # avoid division by zero
            pnl = ((current_value - cost_basis) / cost_basis) * 100

        assets.append(PortfolioAsset(
            symbol=p.asset_symbol,
            quantity=float(p.quantity),
            avg_price=float(p.avg_buy_price),
            current_price=current_price,
            current_value=current_value,
            pnl=pnl
        ))

        total_value += current_value

    return PortfolioResponse(
        assets=assets,
        total_value=total_value,
        updated_at=datetime.utcnow()
    )
