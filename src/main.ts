import * as core from '@actions/core'
import * as github from '@actions/github'
import { exec } from '@actions/exec'

import run from './run'

run(github.context, exec, core)
