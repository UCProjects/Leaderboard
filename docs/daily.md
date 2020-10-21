---
title: Daily Updates
layout: page
---

{% assign posts = site.daily | reverse %}
{% for post in posts %}
<details>
  <summary>
    <a href="{{ post.url }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</a>
  </summary>
  <a href="{{ post.url }}">{{ post.excerpt }}</a>
</details>
{% endfor %}
{% unless posts.size %}
Nothing here currently, wait for the next update!
{% endunless %}
