# Proficionym API (Node/Express implementation)

This is the underlying api for Proficionym. It was needed to work around CORS issues with the dictionaryapi as well as to be able to use raw whois instead of using a third-party api for domain lookups.

## What does it do?

This api exposes 2 endpoints that accept queries. The first is a synonyms endpoint that fetches synonyms for the provided word. The second is an endpoint to perform a single whois lookup. Single lookups were used to provide better frontend user feedback during the query process. Batch queries were deemed too slow after preliminary testing.

## License

The MIT License (MIT)

Copyright (c) 2015 Appropont

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.