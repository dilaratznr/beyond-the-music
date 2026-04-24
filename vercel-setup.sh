#!/bin/bash
read -sp "Resend API key: " RESEND_KEY
echo

for key in NEXT_PUBLIC_APP_URL NEXTAUTH_URL SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM; do
  vercel env rm "$key" production -y 2>/dev/null
done

printf "https://beyond-the-music-xi.vercel.app\n" | vercel env add NEXT_PUBLIC_APP_URL production
printf "https://beyond-the-music-xi.vercel.app\n" | vercel env add NEXTAUTH_URL production
printf "smtp.resend.com\n"                        | vercel env add SMTP_HOST production
printf "587\n"                                    | vercel env add SMTP_PORT production
printf "resend\n"                                 | vercel env add SMTP_USER production
printf "%s\n" "$RESEND_KEY"                       | vercel env add SMTP_PASSWORD production
printf "Beyond The Music <onboarding@resend.dev>\n" | vercel env add SMTP_FROM production

vercel --prod
