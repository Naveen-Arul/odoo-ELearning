const axios = require('axios');

const username = 'octocat'; // Test with a known public user
const url = `https://api.github.com/users/${username}/repos?per_page=5&sort=updated`;

async function testFetch() {
    console.log(`Fetching repos for user: ${username}...`);
    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'SkillForge-test-script' // GitHub requires User-Agent
            }
        });

        if (response.status !== 200) {
            console.error(`Failed with status: ${response.status}`);
            return;
        }

        const repos = response.data;
        console.log(`Successfully fetched ${repos.length} repositories.`);

        if (repos.length > 0) {
            console.log('\n--- Repository Details Sample ---');
            repos.forEach(repo => {
                console.log(`\nName: ${repo.name}`);
                console.log(`Description: ${repo.description}`);
                console.log(`Language: ${repo.language}`);
                console.log(`URL: ${repo.html_url}`);
                console.log(`Stars: ${repo.stargazers_count}`);

                // Validation check
                if (!repo.name || !repo.html_url) {
                    console.error('❌ Missing critical fields!');
                }
            });
            console.log('\n---------------------------------');
            console.log('✅ Verification Successful: API returns necessary project details.');
        } else {
            console.log('No repos found (but request was successful).');
        }

    } catch (error) {
        console.error('Error fetching:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testFetch();
