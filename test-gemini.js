const key = "AIzaSyD6k0VbRApZh-WN-gQFH2bCWN4sXfqmQPE";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log(data.models.map(m => m.name)))
  .catch(console.error);
