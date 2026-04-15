import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Numeric, Integer, Enum, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SplitMode(str, enum.Enum):
    EQUAL = "equal"
    CUSTOM = "custom"
    PERCENTAGE = "percentage"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    groups_created = relationship("Group", back_populates="creator")
    memberships = relationship("GroupMember", back_populates="user")
    expenses_created = relationship("Expense", back_populates="creator")


class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    participants = relationship("Participant", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")
    balances = relationship("Balance", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    color = Column(String, nullable=True)
    avatar_initial = Column(String, nullable=True)

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )


class Participant(Base):
    __tablename__ = "participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    avatar_initial = Column(String, nullable=True)

    group = relationship("Group", back_populates="participants")
    expenses_paid = relationship("Expense", back_populates="payer")
    splits = relationship("ExpenseSplit", back_populates="participant")
    balances_owed = relationship("Balance", foreign_keys="Balance.from_participant_id", back_populates="from_participant")
    balances_due = relationship("Balance", foreign_keys="Balance.to_participant_id", back_populates="to_participant")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    split_mode = Column(Enum(SplitMode), nullable=False, default=SplitMode.EQUAL)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="expenses")
    payer = relationship("Participant", back_populates="expenses_paid")
    creator = relationship("User", back_populates="expenses_created")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False)
    share_amount = Column(Numeric(10, 2), nullable=False)

    expense = relationship("Expense", back_populates="splits")
    participant = relationship("Participant", back_populates="splits")


class Balance(Base):
    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    from_participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False)
    to_participant_id = Column(UUID(as_uuid=True), ForeignKey("participants.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="balances")
    from_participant = relationship("Participant", foreign_keys=[from_participant_id], back_populates="balances_owed")
    to_participant = relationship("Participant", foreign_keys=[to_participant_id], back_populates="balances_due")
