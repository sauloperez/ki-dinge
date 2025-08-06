import pytest

from src.agent import GmailAgent
from src.config import Settings, get_settings


@pytest.fixture(scope="module")
def settings() -> Settings:
    return get_settings()


@pytest.fixture(scope="module")
def agent(settings: Settings):
    """Fixture to create a GmailAgent instance."""
    return GmailAgent(settings)


@pytest.mark.asyncio
async def test_get_last_email(agent: GmailAgent):
    await agent.initialize()
    response = await agent.chat("What's the subject of the last email")
    print(response)
