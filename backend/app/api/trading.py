# backend/app/api/trading.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc  # Add this import for ordering
from typing import List
from .models import Trade, User
from .dependencies import get_current_user, get_db  # Adjust if your deps are elsewhere

router = APIRouter(prefix="/trading", tags=["trading"])  # Add prefix for consistency

@router.get("/trades/history", response_model=List[dict])
def get_trade_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == current_user.id)
        .order_by(desc(Trade.executed_at))
        .limit(limit)
        .all()
    )
    
    if not trades:
        return []  # Return empty list instead of 404

    return [
        {
            "id": t.id,
            "symbol": t.symbol,
            "type": t.type,
            "quantity": t.quantity,
            "price": t.price,
            "total": t.quantity * t.price,
            "executed_at": t.executed_at.isoformat()  # Better for JSON serialization
        }
        for t in trades
    ]
