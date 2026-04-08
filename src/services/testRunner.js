const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Triggers tests async in background
function triggerTestsForResource(resource) {
  const isVM = resource.type === 'VM';
  const testSuite = isVM ? 'vm.test.js' : 'storage.test.js';
  const workflowSuite = 'workflow.test.js';

  console.log(`[TestRunner] Triggering tests for resource ID ${resource.id}`);

  // Run the Unit test specific to resource type
  runJestTest(testSuite, resource, 'Unit').then(() => {
    // Then run integration test
    runJestTest(workflowSuite, resource, 'Integration');
  });
}

function runJestTest(suiteName, resource, type) {
  return new Promise(async (resolve) => {
    const startTime = Date.now();
    const details = JSON.parse(resource.details);
    
    // We pass resource details via environment variables so the Jest test can read them
    const envVars = {
      ...process.env,
      TEST_RESOURCE_ID: resource.id.toString(),
      TEST_TYPE: resource.type,
      ...Object.keys(details).reduce((acc, key) => {
        acc[`TEST_PARAM_${key.toUpperCase()}`] = details[key].toString();
        return acc;
      }, {})
    };

    // Use jest JSON output to parse results elegantly.
    // Ensure we use local npx jest so it works perfectly.
    const command = `npx jest tests/${suiteName} --json --noStackTrace --env=node`;

    exec(command, { env: envVars }, async (error, stdout, stderr) => {
      const execTime = Date.now() - startTime;
      let status = 'Fail';
      let logMsg = '';
      
      try {
        // Find JSON block starting with { "numFailedTestSuites"
        const jsonMatch = stdout.match(/\{[\s\S]*"numFailedTestSuites"[\s\S]*\}$/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          status = result.success ? 'Pass' : 'Fail';
          logMsg = `Ran ${result.numTotalTests} tests: ${result.numPassedTests} passed, ${result.numFailedTests} failed.`;
          
          if(result.numFailedTests > 0) {
            logMsg += " Failed Details: " + result.testResults[0].message.substring(0, 100);
          }
        } else {
            // fallback if JSON parsing failed
            status = error ? 'Fail' : 'Pass';
            logMsg = stdout.substring(0, 150) || stderr.substring(0, 150);
        }
      } catch (parseErr) {
        status = 'Fail';
        logMsg = 'Error parsing test output';
      }

      const testRun = await prisma.testRun.create({
        data: {
          name: `${resource.type} ${type} Test`,
          type: type,
          status: status,
          executionTime: execTime,
          log: logMsg
        }
      });

      console.log(`[TestRunner] Completed ${suiteName} -> ${status} in ${execTime}ms`);

      if (global.io) {
        global.io.emit('test-completed', testRun);
      }
      resolve();
    });
  });
}

module.exports = {
  triggerTestsForResource
};
