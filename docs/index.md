---
title: Home
layout: default
---
{% assign post = site.hourly | reverse | first %}
# Hourly Top 5
{% if post %}
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }}) Updated: <span data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</span>
{% else %}
Nothing right now, come back later
{% endif %}
{% assign post = site.daily | reverse | first %}
# Daily Top 5
{% if post %}
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }}) Updated: <span data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</span>
{% else %}
Nothing right now, come back later
{% endif %}
{% assign post = site.weekly | reverse | first %}
# Weekly Top 5
{% if post %}
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }}) Updated: <span data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</span>
{% else %}
Nothing right now, come back later
{% endif %}
