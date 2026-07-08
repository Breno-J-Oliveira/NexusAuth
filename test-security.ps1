$body = @{
    email = "test@example.com"
    password = "Test123456!"
    name = "Test User"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/auth/register' -Method POST -ContentType 'application/json' -Body $body
