| Key | Accepted value | Description | Default |
| --- | --- | --- | --- |
| sort | 'fancyname', 'id', 'author', 'downloadCount'*, 'score'** | Sort result by this | 'downloadCount' |
| limit | Number larger than 0, 'all' | Limit result being returned. This will not work if search have any string | 10 |
| search | String, length less than 32 | Search fancyName by this. If undefined, list all | undefined |
| threshold | A number between 0.0 and 1.0 | If search is defined, this will be sent to fuse.js as threshold | 0.6 |
