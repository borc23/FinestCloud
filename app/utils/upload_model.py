from huggingface_hub import login, upload_file

# Login with your token
login()

# Create a new repo for your model
repo_id = "Borc23/finestcloud-models"

# Upload your model file
model_path = "app/models/v3.pt"
upload_file(path_or_fileobj=model_path, path_in_repo="v3.pt", repo_id=repo_id)

print(f"Model uploaded successfully to {repo_id}")
