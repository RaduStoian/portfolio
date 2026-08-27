@php
  use App\Support\Site;

  // $page comes from routes/web.php via App\Support\Site::page(). Everything
  // here is server-rendered on purpose: the app itself is a Vue SPA, so this
  // <head> is the only thing a crawler that skips JavaScript ever reads.
  $page ??= [];

  $title = $page['title'] ?? Site::NAME.' — '.Site::TAGLINE;
  $description = $page['description'] ?? 'Portfolio of '.Site::NAME.', '.lcfirst(Site::TAGLINE).'.';
  $canonical = url()->current();
  $robots = ($page['noindex'] ?? false) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  $ogImage = url('/images/icon.png');

  // Person + the projects, so search engines and assistants get the same
  // facts the page shows without having to run the app. Built here rather
  // than inline in @json() below, which Blade's parser can't read across
  // multiple lines.
  $schema = [
    '@context' => 'https://schema.org',
    '@type' => 'Person',
    'name' => Site::NAME,
    'alternateName' => 'Mike Stoian',
    'jobTitle' => Site::TAGLINE,
    'email' => 'mailto:'.Site::EMAIL,
    'url' => rtrim(config('app.url'), '/').'/',
    'knowsAbout' => ['PHP', 'Laravel', 'Vue.js', 'Go', 'Python', 'MySQL', 'PostgreSQL', 'Linux', 'AWS'],
    'owns' => collect(Site::projects())->map(fn ($p) => array_filter([
      '@type' => 'SoftwareApplication',
      'name' => $p['title'],
      'description' => $p['description'],
      'url' => $p['url'],
      'applicationCategory' => 'WebApplication',
    ]))->values(),
  ];
@endphp
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0e0e12">

  <title>{{ $title }}</title>
  <meta name="description" content="{{ $description }}">
  <meta name="author" content="{{ Site::NAME }}">
  <meta name="robots" content="{{ $robots }}">
  <link rel="canonical" href="{{ $canonical }}">

  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/images/icon.png" type="image/png">
  <link rel="apple-touch-icon" href="/images/icon.png">

  <meta property="og:site_name" content="{{ Site::NAME }}">
  <meta property="og:title" content="{{ $title }}">
  <meta property="og:description" content="{{ $description }}">
  <meta property="og:url" content="{{ $canonical }}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{{ $ogImage }}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{ $title }}">
  <meta name="twitter:description" content="{{ $description }}">
  <meta name="twitter:image" content="{{ $ogImage }}">

  <script type="application/ld+json">
    @json($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
  </script>

  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
<div id="app"></div>
<noscript>
  <p style="font-family: system-ui, sans-serif; padding: 24px;">
    This portfolio needs JavaScript. A plain-text version of everything on it lives at
    <a href="/llms.txt">/llms.txt</a>, or email {{ Site::EMAIL }}.
  </p>
</noscript>
</body>
</html>
