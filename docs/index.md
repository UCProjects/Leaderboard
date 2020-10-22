---
layout: default
---
{% assign post = site.hourly | reverse | first %}
# Top 5 Hourly
{% if post %}
  Last updated: <span data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</span>
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }})
{% else %}
Nothing right now, come back later
{% endif %}
{% assign post = site.daily | reverse | first %}
# Top 5 Daily
{% if post %}
  Last updated: <span data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</span>
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }})
{% else %}
Nothing right now, come back later
{% endif %}
{% assign post = site.weekly | reverse | first %}
# Top 5 Weekly
{% if post %}
  Last updated: <span data-time="{{ post.slug }}">{{ post.slug | date: "%Y-%m-%d %H:%M" }}</span>
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }})
{% else %}
Nothing right now, come back later
{% endif %}
