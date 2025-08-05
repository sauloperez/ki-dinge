from unittest.mock import AsyncMock, MagicMock

import pytest

from src.config import get_settings
from src.gmail_service import GmailService

settings = get_settings()


@pytest.mark.asyncio
async def test_list_messages_returns_expected_data():
    # Arrange
    service = GmailService(settings=settings)

    mock_service = MagicMock()
    mock_messages = MagicMock()
    mock_execute = MagicMock(return_value={"messages": [{"id": "1"}, {"id": "2"}]})

    # Set up the chain: service.users().messages().list().execute()
    mock_messages.list.return_value.execute = mock_execute
    mock_service.users.return_value.messages.return_value = mock_messages
    service.service = mock_service

    # Act
    result = await service.list_messages(query="from:test@example.com", max_results=2)

    # Assert
    assert isinstance(result, list)
    assert result == [{"id": "1"}, {"id": "2"}]
    mock_service.users.assert_called_once()
    mock_messages.list.assert_called_once_with(
        userId="me", q="from:test@example.com", maxResults=2
    )


@pytest.mark.asyncio
async def test_list_messages_authenticates_if_needed():
    # Arrange
    service = GmailService(settings=settings)

    # Mock authenticate method to inject fake service
    service.authenticate = AsyncMock()

    mock_service = MagicMock()
    mock_messages = MagicMock()
    mock_execute = MagicMock(return_value={"messages": []})

    mock_messages.list.return_value.execute = mock_execute
    mock_service.users.return_value.messages.return_value = mock_messages

    # When authenticate is called, it sets self.service
    async def fake_auth():
        service.service = mock_service

    service.authenticate.side_effect = fake_auth
    service.service = None  # Explicitly not authenticated

    # Act
    result = await service.list_messages()

    # Assert
    assert result == []
    service.authenticate.assert_called_once()
    mock_service.users.assert_called_once()
    mock_messages.list.assert_called_once_with(userId="me", q="", maxResults=10)
