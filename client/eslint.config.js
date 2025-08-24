//  @ts-check
import reactHooks from 'eslint-plugin-react-hooks';
import { tanstackConfig } from '@tanstack/eslint-config'

export default [...tanstackConfig, reactHooks.configs['recommended-latest'],]
