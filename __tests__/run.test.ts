import { Context } from '@actions/github/lib/context'

import run, { ExecFn } from '../src/run'

describe('Run function', () => {

    let context: Context
    let exec: ExecFn
    let core: {
        getInput: (key: string, opts?: { required: boolean }) => string,
        setOutput: (name: string, value: string) => void,
        debug: (...args: any[]) => void,
        info: (...args: any[]) => void,
        setFailed: (message: string) => void,
        [k: string]: any,
    }

    beforeEach(() => {
        context = ({
            sha: '6c631b0e5e13c7b5fcd045b9b0f1c89be2e7a9c7',
            repo: { owner: 'peachjar', repo: 'peachjar-svc-auth' }
        } as any) as Context
        exec = jest.fn(() => Promise.resolve(0))
        core = {
            getInput: jest.fn((key) => {
                if (key === 'skipIntegrationTests') return 'false'
                return ''
            }),
            setOutput: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            setFailed: jest.fn()
        }
    })

    describe('when the image build is successful', () => {
        it('should build the Docker image and pull the test results out of the container', async () => {
            const expectedImage = 'docker.pkg.github.com/peachjar/peachjar-svc-auth/svc-auth:git-6c631b0'
            await run(context, exec, core)
            expect(exec).toHaveBeenNthCalledWith(1, 'docker', [
                'build',
                '--network=host',
                '--build-arg', 'SKIP_INTEGRATION_TESTS=false',
                '-t', expectedImage, '.',
            ])
            expect(exec).toHaveBeenNthCalledWith(2, 'docker', [
                'create', '--name', 'test-results', expectedImage,
            ])
            expect(exec).toHaveBeenNthCalledWith(3, 'docker', [
                'cp', 'test-results:/opt/svc/reports', '.',
            ])
            expect(exec).toHaveBeenNthCalledWith(4, 'docker', [
                'cp', 'test-results:/opt/svc/coverage', '.',
            ])
            expect(exec).toHaveBeenNthCalledWith(5, 'docker', [
                'rm', 'test-results',
            ])
            expect(core.setOutput).toHaveBeenCalledWith('image', expectedImage)
            expect(core.setFailed).not.toHaveBeenCalled()
        })

        describe('and skipIntegrationTests input is [true]', () => {

            beforeEach(() => {
                core.getInput = jest.fn((key) => {
                    if (key === 'skipIntegrationTests') return 'true'
                    return ''
                })
            })

            it('should build the Docker image and skip integration tests', async () => {
                const expectedImage = 'docker.pkg.github.com/peachjar/peachjar-svc-auth/svc-auth:git-6c631b0'
                await run(context, exec, core)
                expect(exec).toHaveBeenNthCalledWith(1, 'docker', [
                    'build',
                    '--network=host',
                    '--build-arg', 'SKIP_INTEGRATION_TESTS=true',
                    '-t', expectedImage, '.',
                ])
                expect(core.setFailed).not.toHaveBeenCalled()
            })
        })

        describe('and imageName is provided', () => {

            beforeEach(() => {
                core.getInput = jest.fn((key) => {
                    if (key === 'imageName') return 'jojo-rabbit'
                    return 'false'
                })
            })

            it('should build the Docker image with a custom name', async () => {
                const expectedImage = 'docker.pkg.github.com/peachjar/peachjar-svc-auth/jojo-rabbit:git-6c631b0'
                await run(context, exec, core)
                expect(exec).toHaveBeenNthCalledWith(1, 'docker', [
                    'build',
                    '--network=host',
                    '--build-arg', 'SKIP_INTEGRATION_TESTS=false',
                    '-t', expectedImage, '.',
                ])
                expect(core.setFailed).not.toHaveBeenCalled()
            })
        })

        describe('and extraBuildArgs is provided', () => {

            beforeEach(() => {
                core.getInput = jest.fn((key) => {
                    const extraBuildArgs = { foo: 'bar', spam: 'eggs' }
                    const ebaStr = JSON.stringify(extraBuildArgs)
                    if (key === 'extraBuildArgs') return ebaStr
                    return ''
                })
            })

            it('build docker image with extra build-args', async () => {
                const expectedImage = 'docker.pkg.github.com/peachjar/peachjar-svc-auth/svc-auth:git-6c631b0'
                await run(context, exec, core)
                expect(exec).toHaveBeenNthCalledWith(1, 'docker', [
                    'build',
                    '--network=host',
                    '--build-arg', 'SKIP_INTEGRATION_TESTS=false',
                    '--build-arg', 'foo=bar',
                    '--build-arg', 'spam=eggs',
                    '-t', expectedImage, '.',
                ])
            })
        })
    })

    describe('when the image build fails', () => {

        const error = new Error('Kaboom!')

        beforeEach(() => {
            exec = jest.fn(() => Promise.reject(error))
        })

        it('should fail the action', async () => {
            await run(context, exec, core)
            expect(core.setFailed).toHaveBeenCalledWith(error.message)
        })
    })
})
