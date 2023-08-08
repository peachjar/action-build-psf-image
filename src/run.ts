import { Context } from '@actions/github/lib/context'

import * as im from '@actions/exec/lib/interfaces'

export type ExecFn = (commandLine: string, args?: string[], options?: im.ExecOptions) => Promise<number>
export type GetInputFn = (key: string, opts?: { required: boolean }) => string

function resolveImageName(getInput: GetInputFn, repo: string): string {
    let imageName = getInput('imageName')
    if (!imageName) {
        imageName = repo.startsWith('peachjar-') ? repo.slice('peachjar-'.length) : repo
    }
    return imageName
}

export default async function run(
    context: Context,
    exec: ExecFn,
    core: {
        getInput: GetInputFn,
        setOutput: (name: string, value: string) => void,
        info: (...args: any[]) => void,
        debug: (...args: any[]) => void,
        setFailed: (message: string) => void,
        [k: string]: any,
    }
): Promise<void> {

    try {
        core.info('Starting Docker image build.')

        const skipIntegrationTests = (core.getInput('skipIntegrationTests') || 'false').toLowerCase() === 'true'

        const repo = context.repo.repo
        const sha7 = context.sha.slice(0, 7)
        const imageName = resolveImageName(core.getInput, repo)

        const dockerImage = `ghcr.io/${context.repo.owner}/${repo}/${imageName}:git-${sha7}`

        await exec('docker', [
            'build',
            '--network=host',
            '--build-arg', `SKIP_INTEGRATION_TESTS=${skipIntegrationTests}`,
            '-t', dockerImage, '.',
        ])

        core.debug('Extracting test coverage from Docker image.')

        await exec('docker', ['create', '--name', 'test-results', dockerImage])

        core.debug('Copying the unit test reports')

        await exec('docker', ['cp', 'test-results:/opt/svc/reports', '.'])

        core.debug('Copying the test coverage reports')

        await exec('docker', ['cp', 'test-results:/opt/svc/coverage', '.'])

        core.debug('Removing the test-results container')

        await exec('docker', ['rm', 'test-results'])

        core.setOutput('image', dockerImage)

        core.info('Build complete.')

    } catch (error) {

        core.setFailed(error.message)
    }
}
