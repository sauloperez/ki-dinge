"""Gmail service using Google API with OAuth2 authentication."""

import asyncio
from typing import Any, Dict, List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from pydantic import BaseModel

from .config import Settings


class EmailMessage(BaseModel):
    """Email message model."""

    id: str
    thread_id: str
    subject: str
    sender: str
    recipient: str
    body: str
    date: str
    labels: List[str]


class GmailService:
    """Async Gmail service with OAuth2 authentication."""

    SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.service: Optional[Any] = None
        self.credentials: Optional[Credentials] = None

    async def authenticate(self) -> None:
        """Authenticate with Gmail API using OAuth2."""
        creds = None

        # Load existing token
        if self.settings.gmail_token_path.exists():
            creds = Credentials.from_authorized_user_file(
                str(self.settings.gmail_token_path), self.SCOPES
            )

        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not self.settings.gmail_credentials_path.exists():
                    raise FileNotFoundError(
                        f"Gmail credentials file not found: {self.settings.gmail_credentials_path}"
                    )

                flow = InstalledAppFlow.from_client_secrets_file(
                    str(self.settings.gmail_credentials_path), self.SCOPES
                )
                creds = flow.run_local_server(port=0)

            # Save credentials for next run
            with open(self.settings.gmail_token_path, "w") as token:
                token.write(creds.to_json())

        self.credentials = creds
        self.service = build("gmail", "v1", credentials=creds)

    async def list_messages(
        self, query: str = "", max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """List Gmail messages with optional query."""
        if not self.service:
            await self.authenticate()

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.service.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute(),
        )

        return result.get("messages", [])

    async def get_message(self, message_id: str) -> EmailMessage:
        """Get full message details."""
        if not self.service:
            await self.authenticate()

        loop = asyncio.get_event_loop()
        message = await loop.run_in_executor(
            None,
            lambda: self.service.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute(),
        )

        return self._parse_message(message)

    async def get_recent_emails(self, count: int = 10) -> List[EmailMessage]:
        """Get recent emails."""
        messages = await self.list_messages(max_results=count)

        # Fetch full details for each message concurrently
        tasks = [self.get_message(msg["id"]) for msg in messages]
        return await asyncio.gather(*tasks)

    def _parse_message(self, message: Dict[str, Any]) -> EmailMessage:
        """Parse Gmail API message into EmailMessage model."""
        headers = {h["name"]: h["value"] for h in message["payload"].get("headers", [])}

        # Extract body
        body = self._extract_body(message["payload"])

        return EmailMessage(
            id=message["id"],
            thread_id=message["threadId"],
            subject=headers.get("Subject", "No Subject"),
            sender=headers.get("From", "Unknown"),
            recipient=headers.get("To", "Unknown"),
            body=body,
            date=headers.get("Date", "Unknown"),
            labels=message.get("labelIds", []),
        )

    def _extract_body(self, payload: Dict[str, Any]) -> str:
        """Extract email body from payload."""
        body = ""

        if "parts" in payload:
            for part in payload["parts"]:
                if part["mimeType"] == "text/plain":
                    data = part["body"].get("data", "")
                    if data:
                        import base64

                        body = base64.urlsafe_b64decode(data).decode("utf-8")
                        break
        elif payload["mimeType"] == "text/plain":
            data = payload["body"].get("data", "")
            if data:
                import base64

                body = base64.urlsafe_b64decode(data).decode("utf-8")

        return body[:1000]  # Truncate for display

