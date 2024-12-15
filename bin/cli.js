#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc version từ package.json
const packageJson = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url))
);

let projectPath = '';

try {
  program
    .version(packageJson.version)
    .argument('[project-directory]', 'Project directory name')
    .option('-t, --template <template-name>', 'Template to use', 'cardano-croc')
    .action(async (projectDirectory, options) => {
      let targetDir = projectDirectory;

      // Nếu không có tên project, hỏi user
      if (!targetDir) {
        const { projectName } = await inquirer.prompt({
          type: 'input',
          name: 'projectName',
          message: 'What is your project named?',
          default: 'my-cardano-app'
        });
        targetDir = projectName;
      }

      const root = path.resolve(targetDir);
      const templateDir = path.resolve(__dirname, '../template', options.template);
      projectPath = root;

      // Kiểm tra xem thư mục đã tồn tại chưa
      if (fs.existsSync(root)) {
        const { overwrite } = await inquirer.prompt({
          type: 'confirm',
          name: 'overwrite',
          message: 'Directory already exists. Overwrite?',
          default: false
        });
        
        if (!overwrite) {
          console.log(chalk.red('Operation cancelled'));
          process.exit(1);
        }
        await fs.remove(root);
      }

      // Tạo thư mục project
      fs.ensureDirSync(root);

      console.log(chalk.blue('Creating a new Cardano dApp in', chalk.green(root)));

      // Copy template
      await fs.copy(templateDir, root);

      // Cập nhật package.json của project mới
      const projectPackageJsonPath = path.join(root, 'package.json');
      const projectPackageJson = JSON.parse(await fs.readFile(projectPackageJsonPath));
      projectPackageJson.name = path.basename(targetDir);
      await fs.writeJson(projectPackageJsonPath, projectPackageJson, { spaces: 2 });

      console.log(chalk.green('\nSuccess!'), 'Created', chalk.cyan(targetDir));
      console.log('\nInside that directory, you can run:');
      console.log('\n  npm install');
      console.log('  npm run dev');
      console.log('\nHappy hacking!');
    });

  program.parse();
} catch (error) {
  console.log(chalk.red('\nError:'), error.message);
  if (projectPath) {
    console.log(chalk.yellow('\nCleaning up...'));
    fs.removeSync(projectPath);
  }
  process.exit(1);
}