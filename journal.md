<div align="center">
  <a href="https://moonshot.hack.club/664" target="_blank">
    <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/35ad2be8c916670f3e1ac63c1df04d76a4b337d1_moonshot.png" 
         alt="This project is part of Moonshot, a 4-day hackathon in Florida visiting Kennedy Space Center and Universal Studios!" 
         style="width: 100%;">
  </a>
</div>
<br />

This site is being build as a part of the insentive by [HackClub](https://hackclub.com/)'s [Moonshot](https://moonshot.hack.club/664). They ask that I keep a journal as I work on the site, so this file will document the development of the site.

## 11 hrs

<img width="1665" height="1009" alt="image" src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/a43c16ea91091c86d8c693f5e89b149bb98c5f86_image.png" />

Nice, it looks like launchpad is finally here, I should start journaling. In the past 11 hours, I have done a ton of backend research to figure out how I want the site to work. I think I've decided on [convex](https://www.convex.dev/) as it supports the responsive features I want the site to have. I also considered just using a [neon](https://neon.com/) database or using cloudflare [durable workers](https://developers.cloudflare.com/durable-objects/). The cloudflare one does look really neat but costs money and is probably too complex for me I also had AI generate a basic ui, don't worry, I'm gonna change it a lot. I don't really like how AI designs websites this was mainly just to serve as a place to demo the backend. Speaking of which, the numbers demo with convex is really neat and has auth which was a pain. I ended up just using [clerk](https://clerk.com/) even though I really tried for self hosted auth with [better-auth](https://www.better-auth.com/) but I could not get it working with convex's magic database. Finally, convex's pricing really scares me so I might have to do some reallocating to save my 1 million request limit for free tier as I'm building the site so that 30 people can all be using the site for an entire school day.
