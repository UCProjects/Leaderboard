---
layout: default
---
{% assign post = site.hourly | reverse | first %}
# Top 5 Leaderboard (Updated Hourly)
{% if post %}
  {: .leaderboard}
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }})
{% else %}
Nothing right now, come back later
{% endif %}
{% assign post = site.daily | reverse | first %}
# Top 5 Leaderboard (Updated Daily)
{% if post %}
  {: .leaderboard}
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }})
{% else %}
Nothing right now, come back later
{% endif %}
{% assign post = site.weekly | reverse | first %}
# Top 5 Leaderboard (Updated Weekly)
{% if post %}
  {: .leaderboard}
  {{ post.excerpt }}
  [See more]({{ post.url | relative_url }})
{% else %}
Nothing right now, come back later
{% endif %}
