
import inspect
try:
    from google import genai
    client = genai.Client(api_key="test")
    if hasattr(client.models, 'generate_videos'):
        print("generate_videos found")
        sig = inspect.signature(client.models.generate_videos)
        print(f"Signature: {sig}")
    else:
        print("generate_videos NOT found")
except Exception as e:
    print(f"Error: {e}")
