from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import google.generativeai as genai
import json
import re

from app.config import settings
from app.core.deps import get_db
from app.core.security import get_current_user
from app.models import Participant, GroupMember, User

router = APIRouter()

genai.configure(api_key=settings.GEMINI_API_KEY)


def _assert_member(db: Session, group_id, user_id):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Group not found")


@router.post("/parse-expense")
def parse_expense(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group_id = body.get("group_id")
    text = body.get("text", "")
    _assert_member(db, group_id, current_user.id)

    participants = db.query(Participant).filter(Participant.group_id == group_id).all()
    names = [p.name for p in participants]

    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"""You are an expense parser for a bill-splitting app.
Participants in this group: {names}
Parse this natural language expense: "{text}"
Return ONLY a valid JSON object with these exact keys:
- description: string
- amount: number
- payer_name: string (must match one of the participant names above, pick the closest match)
- split_mode: "equal" or "custom" or "percentage"
- participant_names: array of participant names to split between
- category: one of food/transport/accommodation/entertainment/utilities/other
No explanation, no markdown, just raw JSON."""

    response = model.generate_content(prompt)
    raw = response.text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"```$", "", raw).strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse AI response")

    payer_name = parsed.get("payer_name", "")
    payer = next(
        (p for p in participants if payer_name.lower() in p.name.lower() or p.name.lower() in payer_name.lower()),
        participants[0] if participants else None,
    )

    split_participants = []
    for name in (parsed.get("participant_names") or names):
        match = next((p for p in participants if name.lower() in p.name.lower() or p.name.lower() in name.lower()), None)
        if match:
            split_participants.append({"id": str(match.id), "name": match.name})

    return {
        "description": parsed.get("description", text),
        "amount": parsed.get("amount", 0),
        "payer_id": str(payer.id) if payer else None,
        "payer_name": payer.name if payer else "",
        "split_mode": parsed.get("split_mode", "equal"),
        "participants": split_participants,
        "category": parsed.get("category", "other"),
    }


@router.post("/summarize")
def summarize_group(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import Expense
    from decimal import Decimal

    group_id = body.get("group_id")
    _assert_member(db, group_id, current_user.id)

    participants = db.query(Participant).filter(Participant.group_id == group_id).all()
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()

    if not expenses:
        return {"summary": "No expenses recorded in this group yet."}

    total = sum(Decimal(str(e.amount)) for e in expenses)
    expense_lines = [f"- {e.description}: ₹{e.amount}" for e in expenses[:10]]

    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"""Summarize this group's expenses in 2-3 friendly sentences.
Total: ₹{total}
Participants: {[p.name for p in participants]}
Expenses:
{chr(10).join(expense_lines)}
Be concise and conversational. No bullet points."""

    response = model.generate_content(prompt)
    return {"summary": response.text.strip()}