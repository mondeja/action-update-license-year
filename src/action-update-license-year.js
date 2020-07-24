const { getInput, setFailed, info } = require('@actions/core');
const { context } = require('@actions/github');
const { transformLicense } = require('./license');
const Repository = require('./Repository');

const FILENAME = 'LICENSE';
const MASTER = 'master';
const BRANCH_NAME = `license/copyright-to-${new Date().getFullYear()}`;

async function run() {
    try {
        const { owner, repo } = context.repo;
        const token = getInput('token', { required: true });

        const repository = new Repository(owner, repo, token);
        const hasBranch = await repository.hasBranch(BRANCH_NAME);
        const licenseResponse = await repository.getContent(hasBranch ? BRANCH_NAME : MASTER, FILENAME);
        const license = Buffer.from(licenseResponse.data.content, 'base64').toString('ascii');

        const currentYear = new Date().getFullYear();
        const updatedLicense = transformLicense(license, currentYear);
        if (updatedLicense === license) {
            info('License file is already up-to-date, my work here is done');
            return;
        }

        if (!hasBranch) {
            info(`Create new branch named ${BRANCH_NAME}`);
            await repository.createBranch(BRANCH_NAME);
        }

        await repository.updateContent(
            BRANCH_NAME,
            FILENAME,
            licenseResponse.data.sha,
            updatedLicense,
            'docs(license): update copyright year(s)'
        );

        if (!(await repository.hasPullRequest(BRANCH_NAME))) {
            info('Create new pull request');
            await repository.createPullRequest(BRANCH_NAME, 'Update license copyright year(s)');
        }
    } catch (err) {
        setFailed(err.message);
    }
}

module.exports = {
    run,
    BRANCH_NAME,
};
