<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  @vite(['resources/css/app.css', 'resources/js/app.js'])

  @php
    // Per-page overrides come from controllers as $pageTitle / $pageDescription
    // / $canonical; everything else falls back to these site defaults.
    $defaultTitle = 'Portfolio';
    $defaultDescription = 'Personal portfolio built with Laravel and Vue.';

    $title = $pageTitle ?? $defaultTitle;
    $description = $pageDescription ?? $defaultDescription;
    $canonicalUrl = $canonical ?? url()->current();
    $robots = $robots ?? 'index, follow, max-image-preview:large';
  @endphp

  <title>{{ $title }}</title>
  <meta name="description" content="{{ $description }}">
  <meta name="robots" content="{{ $robots }}">
  <link rel="canonical" href="{{ $canonicalUrl }}">

  <meta property="og:site_name" content="Portfolio">
  <meta property="og:title" content="{{ $title }}">
  <meta property="og:description" content="{{ $description }}">
  <meta property="og:url" content="{{ $canonicalUrl }}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
<div id="app"></div>
</body>
</html>
