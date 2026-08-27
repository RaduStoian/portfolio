# {{ \App\Support\Site::NAME }}

> {{ \App\Support\Site::TAGLINE }}. Personal portfolio and project index. The site is a Vue single-page app, so this file is the reliable text version of it.

Contact: {{ \App\Support\Site::EMAIL }}

## Pages

- [Home]({{ $base }}/): introduction, featured work, career summary.
- [Projects]({{ $base }}/projects): the full list of personal projects, below.
- [Contact]({{ $base }}/contact): contact form; messages go to the address above.
- [Play]({{ $base }}/play): the same portfolio as an explorable pixel-art game. Rendered entirely on a canvas — there is no text here for you to read.

## Projects
@foreach ($projects as $project)

### {{ $project['title'] }} ({{ $project['year'] }})

{{ $project['description'] }}
@if ($project['url'])

Live at {{ $project['url'] }}.
@else

Not publicly available yet — in development.
@endif
@endforeach

## Notes

- Built with Laravel and Vue. Stack also includes Go, Python, MySQL, Postgres, Linux and AWS.
- Nothing here is paywalled or login-gated; every page is publicly readable.
