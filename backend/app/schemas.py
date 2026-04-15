from datetime import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class SplitMode(str, Enum):
    EQUAL = "equal"
    CUSTOM = "custom"
    PERCENTAGE = "percentage"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GroupCreate(BaseModel):
    name: str


class GroupResponse(BaseModel):
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupMemberCreate(BaseModel):
    user_id: UUID
    color: str | None = None
    avatar_initial: str | None = None


class GroupMemberResponse(BaseModel):
    id: int
    group_id: UUID
    user_id: UUID
    color: str | None
    avatar_initial: str | None

    model_config = {"from_attributes": True}


class ParticipantCreate(BaseModel):
    name: str
    color: str | None = None
    avatar_initial: str | None = None


class ParticipantResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    color: str | None
    avatar_initial: str | None

    model_config = {"from_attributes": True}


class ExpenseSplitCreate(BaseModel):
    participant_id: UUID
    share_amount: Decimal = Field(max_digits=10, decimal_places=2)


class ExpenseSplitResponse(BaseModel):
    id: int
    expense_id: UUID
    participant_id: UUID
    share_amount: Decimal

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    description: str
    amount: Decimal = Field(max_digits=10, decimal_places=2)
    date: datetime
    payer_id: UUID
    split_mode: SplitMode = SplitMode.EQUAL
    splits: list[ExpenseSplitCreate] = []


class ExpenseResponse(BaseModel):
    id: UUID
    group_id: UUID
    description: str
    amount: Decimal
    date: datetime
    payer_id: UUID
    created_by: UUID
    split_mode: SplitMode
    created_at: datetime
    splits: list[ExpenseSplitResponse] = []

    model_config = {"from_attributes": True}


class BalanceResponse(BaseModel):
    id: int
    group_id: UUID
    from_participant_id: UUID
    to_participant_id: UUID
    amount: Decimal
    updated_at: datetime

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: str | None = None
