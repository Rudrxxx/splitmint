from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models import Balance, Expense, ExpenseSplit, Group, GroupMember, Participant, User
from app.schemas import ExpenseCreate, ExpenseResponse, SplitMode

router = APIRouter()


@router.post("/{group_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def add_expense(
    group_id: UUID,
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)

    payer = db.query(Participant).filter(
        Participant.id == payload.payer_id,
        Participant.group_id == group_id,
    ).first()
    if not payer:
        raise HTTPException(status_code=404, detail="Payer not found in this group")

    splits = _compute_splits(payload, group_id, db)

    expense = Expense(
        group_id=group_id,
        description=payload.description,
        amount=payload.amount,
        date=payload.date,
        payer_id=payload.payer_id,
        created_by=current_user.id,
        split_mode=payload.split_mode,
    )
    db.add(expense)
    db.flush()

    for participant_id, share in splits.items():
        db.add(ExpenseSplit(
            expense_id=expense.id,
            participant_id=participant_id,
            share_amount=share,
        ))

    db.commit()
    _recalculate_balances(db, group_id)
    db.refresh(expense)
    return expense


@router.get("/{group_id}/expenses", response_model=list[ExpenseResponse])
def list_expenses(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)
    return (
        db.query(Expense)
        .filter(Expense.group_id == group_id)
        .order_by(Expense.date.desc())
        .all()
    )


@router.get("/{group_id}/expenses/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    group_id: UUID,
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)
    return _get_expense_or_404(db, expense_id, group_id)


@router.patch("/{group_id}/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    group_id: UUID,
    expense_id: UUID,
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)
    expense = _get_expense_or_404(db, expense_id, group_id)

    # delete old splits and recompute
    db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()

    expense.description = payload.description
    expense.amount = payload.amount
    expense.date = payload.date
    expense.payer_id = payload.payer_id
    expense.split_mode = payload.split_mode

    splits = _compute_splits(payload, group_id, db)
    for participant_id, share in splits.items():
        db.add(ExpenseSplit(
            expense_id=expense.id,
            participant_id=participant_id,
            share_amount=share,
        ))

    db.commit()
    _recalculate_balances(db, group_id)
    db.refresh(expense)
    return expense


@router.delete("/{group_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    group_id: UUID,
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_member(db, group_id, current_user.id)
    expense = _get_expense_or_404(db, expense_id, group_id)
    db.delete(expense)
    db.commit()
    _recalculate_balances(db, group_id)


# --- split engine ---

def _compute_splits(payload: ExpenseCreate, group_id: UUID, db: Session) -> dict[UUID, Decimal]:
    total = Decimal(str(payload.amount))

    if payload.split_mode == SplitMode.EQUAL:
        participants = db.query(Participant).filter(Participant.group_id == group_id).all()
        if not participants:
            raise HTTPException(status_code=400, detail="No participants in group")
        n = len(participants)
        base = (total / n).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        splits = {p.id: base for p in participants}
        # fix rounding remainder on first participant
        diff = total - sum(splits.values())
        first = participants[0].id
        splits[first] = splits[first] + diff
        return splits

    if payload.split_mode == SplitMode.CUSTOM:
        if not payload.splits:
            raise HTTPException(status_code=400, detail="Splits required for custom mode")
        given = sum(Decimal(str(s.share_amount)) for s in payload.splits)
        if abs(given - total) > Decimal("0.01"):
            raise HTTPException(status_code=400, detail=f"Split amounts {given} don't add up to {total}")
        return {s.participant_id: Decimal(str(s.share_amount)) for s in payload.splits}

    if payload.split_mode == SplitMode.PERCENTAGE:
        if not payload.splits:
            raise HTTPException(status_code=400, detail="Splits required for percentage mode")
        total_pct = sum(Decimal(str(s.share_amount)) for s in payload.splits)
        if abs(total_pct - Decimal("100")) > Decimal("0.01"):
            raise HTTPException(status_code=400, detail="Percentages must add up to 100")
        result = {}
        for s in payload.splits:
            pct = Decimal(str(s.share_amount))
            result[s.participant_id] = (total * pct / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        diff = total - sum(result.values())
        first_id = payload.splits[0].participant_id
        result[first_id] = result[first_id] + diff
        return result

    raise HTTPException(status_code=400, detail="Unknown split mode")


# --- helpers ---

def _assert_member(db: Session, group_id: UUID, user_id: UUID):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Group not found")


def _get_expense_or_404(db: Session, expense_id: UUID, group_id: UUID) -> Expense:
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.group_id == group_id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


def _recalculate_balances(db: Session, group_id: UUID):
    # pull all expenses and their splits for this group
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()

    # net[participant_id] = amount they are owed (positive) or owe (negative)
    net: dict[UUID, Decimal] = {}
    for expense in expenses:
        payer_id = expense.payer_id
        for split in expense.splits:
            pid = split.participant_id
            share = Decimal(str(split.share_amount))
            net[pid] = net.get(pid, Decimal("0")) - share
            net[payer_id] = net.get(payer_id, Decimal("0")) + share

    # delete existing balances for the group
    db.query(Balance).filter(Balance.group_id == group_id).delete()

    # minimal settlements using greedy algorithm
    creditors = sorted([(v, k) for k, v in net.items() if v > 0], reverse=True)
    debtors = sorted([(abs(v), k) for k, v in net.items() if v < 0], reverse=True)

    ci, di = 0, 0
    while ci < len(creditors) and di < len(debtors):
        credit_amt, creditor_id = creditors[ci]
        debt_amt, debtor_id = debtors[di]
        settled = min(credit_amt, debt_amt).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if settled > Decimal("0"):
            db.add(Balance(
                group_id=group_id,
                from_participant_id=debtor_id,
                to_participant_id=creditor_id,
                amount=settled,
            ))

        creditors[ci] = (credit_amt - settled, creditor_id)
        debtors[di] = (debt_amt - settled, debtor_id)

        if creditors[ci][0] <= Decimal("0.01"):
            ci += 1
        if debtors[di][0] <= Decimal("0.01"):
            di += 1

    db.commit()