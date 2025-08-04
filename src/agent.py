"""LlamaIndex agent with Gmail tools."""

import asyncio

from llama_index.core.agent import ReActAgent
from llama_index.core.tools import FunctionTool
from llama_index.llms.anthropic import Anthropic

from .config import Settings
from .gmail_service import GmailService


class GmailAgent:
    """AI agent with Gmail capabilities."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.gmail_service = GmailService(settings)
        self.llm = Anthropic(
            model="claude-3-haiku-20240307", api_key=settings.anthropic_api_key
        )
        self.agent: ReActAgent | None = None

    async def initialize(self) -> None:
        """Initialize the agent with Gmail tools."""
        await self.gmail_service.authenticate()

        # Create Gmail tools
        tools = [
            self._create_list_emails_tool(),
            self._create_search_emails_tool(),
            self._create_get_email_tool(),
        ]

        # Create ReAct agent
        self.agent = ReActAgent(
            tools=tools, llm=self.llm, verbose=True, max_iterations=10
        )

    def _create_list_emails_tool(self) -> FunctionTool:
        """Create tool to list recent emails."""

        async def list_recent_emails(count: int = 5) -> str:
            """List recent emails from Gmail.

            Args:
                count: Number of emails to retrieve (default: 5, max: 20)

            Returns:
                Formatted string with email summaries
            """
            count = min(count, 20)  # Limit to prevent overload
            emails = await self.gmail_service.get_recent_emails(count)

            if not emails:
                return "No emails found."

            result = f"Found {len(emails)} recent emails:\n\n"
            for i, email in enumerate(emails, 1):
                result += f"{i}. From: {email.sender}\n"
                result += f"   Subject: {email.subject}\n"
                result += f"   Date: {email.date}\n"
                result += f"   Preview: {email.body[:100]}...\n\n"

            return result

        return FunctionTool.from_defaults(
            fn=list_recent_emails,
            name="list_recent_emails",
            description="List recent emails from Gmail inbox",
        )

    def _create_search_emails_tool(self) -> FunctionTool:
        """Create tool to search emails."""

        async def search_emails(query: str, count: int = 5) -> str:
            """Search emails in Gmail.

            Args:
                query: Gmail search query (e.g., 'from:example@gmail.com', 'subject:meeting')
                count: Number of results to return (default: 5, max: 10)

            Returns:
                Formatted string with search results
            """
            count = min(count, 10)
            messages = await self.gmail_service.list_messages(query, count)

            if not messages:
                return f"No emails found for query: {query}"

            # Get full details for found messages
            tasks = [self.gmail_service.get_message(msg["id"]) for msg in messages]
            emails = await asyncio.gather(*tasks)

            result = f"Found {len(emails)} emails matching '{query}':\n\n"
            for i, email in enumerate(emails, 1):
                result += f"{i}. From: {email.sender}\n"
                result += f"   Subject: {email.subject}\n"
                result += f"   Date: {email.date}\n"
                result += f"   Preview: {email.body[:100]}...\n\n"

            return result

        return FunctionTool.from_defaults(
            fn=search_emails,
            name="search_emails",
            description="Search emails in Gmail using Gmail search syntax",
        )

    def _create_get_email_tool(self) -> FunctionTool:
        """Create tool to get full email content."""

        async def get_email_details(email_index: int) -> str:
            """Get full details of a specific email from recent results.

            Args:
                email_index: Index of email from recent list (1-based)

            Returns:
                Full email content
            """
            # For simplicity, get recent emails and return the requested one
            emails = await self.gmail_service.get_recent_emails(20)

            if not emails or email_index < 1 or email_index > len(emails):
                return (
                    f"Email index {email_index} not found. Available: 1-{len(emails)}"
                )

            email = emails[email_index - 1]

            result = "Email Details:\n"
            result += f"From: {email.sender}\n"
            result += f"To: {email.recipient}\n"
            result += f"Subject: {email.subject}\n"
            result += f"Date: {email.date}\n"
            result += f"Labels: {', '.join(email.labels)}\n\n"
            result += f"Body:\n{email.body}\n"

            return result

        return FunctionTool.from_defaults(
            fn=get_email_details,
            name="get_email_details",
            description="Get full content of a specific email by index",
        )

    async def chat(self, message: str) -> str:
        """Chat with the agent about Gmail."""
        if not self.agent:
            await self.initialize()

        response = await self.agent.run(message)
        return str(response)
