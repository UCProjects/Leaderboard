---
title: Hourly Updates
layout: page
category: hourly
---

{% assign posts = site.hourly | reverse %}
{% if posts.size > 0 %}
{% assign sample = posts | first %}
<div id="archive" data-url="{{ sample.url | relative_url | replace: sample.slug, '__SLUG__' }}"></div>
<script type="application/json" id="archive-data">[{% for post in posts %}{{ post.slug }}{% unless forloop.last %},{% endunless %}{% endfor %}]</script>
<script type="module" src="{{ 'assets/js/archive.js' | relative_url }}"></script>
{% else %}
Nothing here currently, wait for the next update!
{% endif %}
