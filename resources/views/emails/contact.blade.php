<!doctype html>
<html>
<body style="font-family: sans-serif; color: #1b1726; line-height: 1.6;">
    <p><strong>{{ $senderName }}</strong> ({{ $senderEmail }}) sent a message from the portfolio contact form:</p>
    <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #8a6bd6; background: #f6f4fb; white-space: pre-wrap;">{{ $body }}</blockquote>
    <p style="color: #6b6478; font-size: 13px;">Reply-to is already set to {{ $senderEmail }}.</p>
</body>
</html>
