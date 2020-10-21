---
layout: default
---

Welcome to Undercards Leaderboard. Here we have the top 5 of each category (navigate for more).

{% assign post = site.hourly | reverse | first %}
# Top 5 Leaderboard (Updated Hourly)
{% if post %}
  {{ post.excerpt }}
  [See more]({{ post.url }})
{% else %}
Nothing right now, come back later
{% endif %}

{% assign post = site.daily | reverse | first %}
# Top 5 Leaderboard (Updated Daily)
{% if post %}
  {{ post.excerpt }}
  [See more]({{ post.url }})
{% else %}
Nothing right now, come back later
{% endif %}

{% assign post = site.weekly | reverse | first %}
# Top 5 Leaderboard (Updated Weekly)
{% if post %}
  {{ post.excerpt }}
  [See more]({{ post.url }})
{% else %}
Nothing right now, come back later
{% endif %}
