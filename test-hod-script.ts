import { hodSuggestionService, staffService } from './src/lib/mongodb-services';

async function test() {
  const suggestions = await hodSuggestionService.findMany({});
  console.log("Suggestions:");
  console.log(suggestions.slice(0, 3));
  if (suggestions.length > 0) {
    const hod = await staffService.findUnique({ id: suggestions[0].hodId });
    console.log("HOD Profile:");
    console.log(hod);
  }
}
test();
