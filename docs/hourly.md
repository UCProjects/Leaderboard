---
title: Hourly Updates
layout: page
category: hourly
---

{% assign posts = site.hourly | reverse %}
{% for post in posts %}
<details>
  <summary>
    <a href="{{ post.url | relative_url }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</a>
  </summary>
  <a href="{{ post.url | relative_url }}">{{ post.excerpt }}</a>
</details>
{% endfor %}
{% unless posts.size %}
Nothing here currently, wait for the next update!
{% endunless %}
