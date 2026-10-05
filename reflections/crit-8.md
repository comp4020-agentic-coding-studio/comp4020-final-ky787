# Crit 8 reflection


## What was the breakthrough that moved the work forward?

When I designed my binary ninja game I originaly had separate agents doing planning, backend binary compilation, and front-end work where they communicated by files on disk and handover notes. Previously I simply had the backend work all done on a frozen dataset and then gave files to claude for the front end. however this time I decidedit would be better to test front end gameplay/mechanics on a handcrafted world and generate binaries from that, rather then generate a stage from a binary. This meant that I had to implement back and forth handovers with the various agents which was effective. 

## What did this work change about who I want to be as a software developer?

I found the agents struggled when it came to fine tuning and designing the game play stages. dispite their creativity the gameplay aspect is still a weakpoint for the models and so the level design required more manual work which will help inform me in the future when doing this kind of thing. 
