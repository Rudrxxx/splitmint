from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models import Group, GroupMember, Participant, User
from app.schemas import (
    GroupCreate,
    GroupResponse,
    ParticipantCreate,
    ParticipantResponse,
)

router = APIRouter()


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == current_user.id)
        .count()
    )
    # allow reasonable number of groups per user
    group = Group(name=payload.name, created_by=current_user.id)
    db.add(group)
    db.flush()

    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    db.refresh(group)
    return group


@router.get("", response_model=list[GroupResponse])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    groups = (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    return groups


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(db, group_id, current_user.id)
    return group


@router.patch("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(db, group_id, current_user.id)
    group.name = payload.name
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(db, group_id, current_user.id)
    if group.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group creator can delete it")
    db.delete(group)
    db.commit()


# --- participants ---

@router.post("/{group_id}/participants", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def add_participant(
    group_id: UUID,
    payload: ParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(db, group_id, current_user.id)

    current_count = db.query(Participant).filter(Participant.group_id == group.id).count()
    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A group can have at most 3 participants (plus you as the primary user)",
        )

    participant = Participant(
        group_id=group.id,
        name=payload.name,
        color=payload.color,
        avatar_initial=payload.avatar_initial or payload.name[0].upper(),
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.get("/{group_id}/participants", response_model=list[ParticipantResponse])
def list_participants(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_group_or_404(db, group_id, current_user.id)
    return db.query(Participant).filter(Participant.group_id == group_id).all()


@router.patch("/{group_id}/participants/{participant_id}", response_model=ParticipantResponse)
def update_participant(
    group_id: UUID,
    participant_id: UUID,
    payload: ParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_group_or_404(db, group_id, current_user.id)
    participant = _get_participant_or_404(db, participant_id, group_id)
    participant.name = payload.name
    if payload.color:
        participant.color = payload.color
    db.commit()
    db.refresh(participant)
    return participant


@router.delete("/{group_id}/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(
    group_id: UUID,
    participant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_group_or_404(db, group_id, current_user.id)
    participant = _get_participant_or_404(db, participant_id, group_id)
    db.delete(participant)
    db.commit()


# --- helpers ---

def _get_group_or_404(db: Session, group_id: UUID, user_id: UUID) -> Group:
    group = (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(Group.id == group_id, GroupMember.user_id == user_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


def _get_participant_or_404(db: Session, participant_id: UUID, group_id: UUID) -> Participant:
    participant = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.group_id == group_id,
    ).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")
    return participant