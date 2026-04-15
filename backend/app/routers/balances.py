from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models import Balance, GroupMember, Participant, User
from app.schemas import BalanceResponse

router = APIRouter()


@router.get("/{group_id}/balances", response_model=list[BalanceResponse])
def get_balances(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)
    return db.query(Balance).filter(Balance.group_id == group_id).all()


@router.get("/{group_id}/settlements")
def get_settlements(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)

    balances = db.query(Balance).filter(Balance.group_id == group_id).all()

    result = []
    for b in balances:
        from_p = db.query(Participant).filter(Participant.id == b.from_participant_id).first()
        to_p = db.query(Participant).filter(Participant.id == b.to_participant_id).first()
        result.append({
            "from_participant_id": str(b.from_participant_id),
            "from_name": from_p.name if from_p else "Unknown",
            "to_participant_id": str(b.to_participant_id),
            "to_name": to_p.name if to_p else "Unknown",
            "amount": str(b.amount),
        })

    return result


@router.get("/{group_id}/summary")
def get_group_summary(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)

    from app.models import Expense, ExpenseSplit
    from decimal import Decimal

    participants = db.query(Participant).filter(Participant.group_id == group_id).all()
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()

    total_spent = sum(Decimal(str(e.amount)) for e in expenses)

    participant_totals = []
    for p in participants:
        paid = sum(Decimal(str(e.amount)) for e in expenses if e.payer_id == p.id)
        owed = sum(
            Decimal(str(s.share_amount))
            for e in expenses
            for s in e.splits
            if s.participant_id == p.id
        )
        participant_totals.append({
            "participant_id": str(p.id),
            "name": p.name,
            "color": p.color,
            "avatar_initial": p.avatar_initial,
            "total_paid": str(paid),
            "total_share": str(owed),
            "net": str(paid - owed),
        })

    return {
        "group_id": str(group_id),
        "total_spent": str(total_spent),
        "participant_count": len(participants),
        "expense_count": len(expenses),
        "participants": participant_totals,
    }


def _assert_member(db: Session, group_id: UUID, user_id: UUID):
    from fastapi import HTTPException
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Group not found")