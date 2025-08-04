"""Gmail Agent CLI - AI-powered Gmail management."""

import asyncio
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text

from .agent import GmailAgent
from .config import get_settings

app = typer.Typer(
    name="gmail-agent", help="AI-powered Gmail management CLI", add_completion=False
)
console = Console()


@app.command()
def chat(
    message: Optional[str] = typer.Argument(None, help="Message to send to the agent"),
    interactive: bool = typer.Option(
        False, "--interactive", "-i", help="Start interactive mode"
    ),
) -> None:
    """Chat with the Gmail AI agent."""
    asyncio.run(_chat_async(message, interactive))


async def _chat_async(message: Optional[str], interactive: bool) -> None:
    """Async chat implementation."""
    try:
        settings = get_settings()
    except Exception as e:
        console.print(f"[red]Configuration error: {e}[/red]")
        console.print("\n[yellow]Setup required:[/yellow]")
        console.print("1. Set OPENAI_API_KEY environment variable")
        console.print("2. Place Gmail credentials.json in current directory")
        console.print("3. Run: export OPENAI_API_KEY='your-key-here'")
        raise typer.Exit(1)

    # Initialize agent
    agent = GmailAgent(settings)

    print(settings)

    with console.status("[bold green]Initializing Gmail agent..."):
        try:
            await agent.initialize()
        except FileNotFoundError as e:
            console.print(f"[red]Error: {e}[/red]")
            console.print("\n[yellow]Gmail Setup Required:[/yellow]")
            console.print("1. Go to Google Cloud Console")
            console.print("2. Enable Gmail API")
            console.print("3. Create OAuth2 credentials")
            console.print("4. Download as 'credentials.json'")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"[red]Authentication error: {e}[/red]")
            raise typer.Exit(1)

    console.print("[green]✓[/green] Gmail agent initialized!")

    if interactive or not message:
        await _interactive_mode(agent)
    else:
        await _single_message(agent, message)


async def _interactive_mode(agent: GmailAgent) -> None:
    """Interactive chat mode."""
    console.print("\n[bold blue]Gmail Agent Interactive Mode[/bold blue]")
    console.print("Type 'quit', 'exit', or press Ctrl+C to exit\n")

    while True:
        try:
            user_input = Prompt.ask("[bold cyan]You")

            if user_input.lower() in ["quit", "exit", "q"]:
                console.print("[yellow]Goodbye![/yellow]")
                break

            if not user_input.strip():
                continue

            with console.status("[bold green]Agent thinking..."):
                response = await agent.chat(user_input)

            # Display response in a panel
            console.print(
                Panel(
                    Text(response, style="white"),
                    title="[bold green]Agent Response[/bold green]",
                    border_style="green",
                )
            )
            console.print()

        except KeyboardInterrupt:
            console.print("\n[yellow]Goodbye![/yellow]")
            break
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")


async def _single_message(agent: GmailAgent, message: str) -> None:
    """Handle single message."""
    with console.status("[bold green]Processing..."):
        response = await agent.chat(message)

    console.print(
        Panel(
            Text(response, style="white"),
            title="[bold green]Gmail Agent[/bold green]",
            border_style="green",
        )
    )


@app.command()
def setup() -> None:
    """Show setup instructions."""
    console.print(
        Panel(
            """[bold yellow]Gmail Agent Setup[/bold yellow]

[bold]1. OpenAI API Key:[/bold]
   export OPENAI_API_KEY="your-openai-api-key"

[bold]2. Gmail API Setup:[/bold]
   • Go to Google Cloud Console
   • Create a new project or select existing
   • Enable Gmail API
   • Create OAuth2 credentials (Desktop application)
   • Download credentials as 'credentials.json'
   • Place in current directory

[bold]3. Test the setup:[/bold]
   gmail-agent "Show me my recent emails"

[bold]Example queries:[/bold]
   • "List my recent emails"
   • "Show emails from today"
   • "Find emails about meetings"
   • "Summarize my inbox"
        """,
            title="Setup Instructions",
            border_style="blue",
        )
    )


@app.command()
def version() -> None:
    """Show version information."""
    console.print("[bold green]Gmail Agent v0.1.0[/bold green]")
    console.print("AI-powered Gmail management with LlamaIndex")


if __name__ == "__main__":
    app()
