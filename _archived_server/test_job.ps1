$ErrorActionPreference = "Stop"
$Region = "europe-west2"
gcloud run services describe pitchperfectai-backend --region $Region --format='value(spec.template.spec.containers[0].image)' > image.txt
$Image = Get-Content image.txt
Write-Host "Image: $Image"
gcloud run jobs create test-job-verify --image $Image --region $Region --command echo --args hello --quiet
