---
title: Weekly Updates
layout: page
category: weekly
---

{% assign posts = site.weekly | reverse %}
{% for post in posts %}
<details>
  <summary>
    <a href="{{ post.url | relative_url }}" data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</a>
  </summary>
  {{ post.excerpt }}
  <a href="{{ post.url | relative_url }}">See more</a>
</details>
{% endfor %}
{% unless posts.size > 0 %}
Nothing here currently, wait for the next update!
{% endunless %}
