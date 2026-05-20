from a2a.helpers import new_text_message
from a2a.client import create_client
from a2a.client import ClientConfig
from a2a.types.a2a_pb2 import SendMessageRequest, Role
import httpx
from a2a.client import A2ACardResolver
from a2a.helpers import display_agent_card


async def main() -> None:
    base_url = "http://127.0.0.1:9999/"

    async with httpx.AsyncClient(timeout=600) as httpx_client:
        resolver = A2ACardResolver(
            httpx_client=httpx_client,
            base_url=base_url,
        )

        public_card = await resolver.get_agent_card()
        print("\nSuccessfully fetched public agent card:")
        display_agent_card(public_card)

        print("\n--- Non-Streaming Call ---")
        config = ClientConfig(streaming=False)
        client = await create_client(agent=public_card, client_config=config)
        print("\nNon-streaming Client initialized.")

        message = new_text_message("Say hello.", role=Role.ROLE_USER)
        request = SendMessageRequest(message=message)

        print("Response:")
        async for chunk in client.send_message(request):
            print(chunk)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
