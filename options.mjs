import { program } from 'commander';

program.option('-s, --environment <string>');
program.parse();
const options = program.opts();

const getEnvironment = () => {
  let { environment } = options;

  if (!environment || (environment === 'dev' || environment === 'prod')) {
    environment ||= 'dev';
    console.log('using environment:', environment);
    return environment;
  }
  console.error('invalid environment:', environment);
  process.exit(1);
};

export const environment = getEnvironment();
