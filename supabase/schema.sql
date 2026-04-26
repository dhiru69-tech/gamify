-- ═══════════════════════════════════════════════════════════
-- GAMIFY — Fixed Schema for Supabase (UUID-based)
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop existing tables if re-running
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          TEXT NOT NULL UNIQUE,
  email             TEXT NOT NULL UNIQUE,
  hashed_password   TEXT NOT NULL,
  level             INT  NOT NULL DEFAULT 1,
  xp                INT  NOT NULL DEFAULT 0,
  total_xp          INT  NOT NULL DEFAULT 0,
  streak_days       INT  NOT NULL DEFAULT 0,
  failed_attempts   INT  NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_banned         BOOLEAN NOT NULL DEFAULT FALSE,
  badges            TEXT NOT NULL DEFAULT '[]',
  last_active       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Challenges ───────────────────────────────────────────────
CREATE TABLE challenges (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  story         TEXT,
  difficulty    TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard','boss')),
  game_mode     TEXT NOT NULL CHECK (game_mode IN ('puzzle','battle','quest','debug','boss')),
  language      TEXT NOT NULL CHECK (language IN ('python','javascript','cpp','java')),
  level_req     INT  NOT NULL DEFAULT 1,
  starter_code  TEXT NOT NULL,
  solution      TEXT NOT NULL,
  hints         JSONB NOT NULL DEFAULT '[]',
  test_cases    JSONB NOT NULL DEFAULT '[]',
  xp_reward     INT  NOT NULL DEFAULT 100,
  time_limit    INT  NOT NULL DEFAULT 120,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User Progress ─────────────────────────────────────────────
CREATE TABLE user_progress (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id  BIGINT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  attempts      INT NOT NULL DEFAULT 0,
  xp_earned     INT NOT NULL DEFAULT 0,
  time_taken    FLOAT,
  hints_used    INT NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_users_username  ON users(username);
CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_total_xp  ON users(total_xp DESC);
CREATE INDEX idx_progress_user   ON user_progress(user_id);
CREATE INDEX idx_challenges_lang ON challenges(language);

-- ── Disable RLS (Edge Function uses service_role key) ─────────
ALTER TABLE users         DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenges    DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- SEED — 22 challenges
-- ═══════════════════════════════════════════════════════════

INSERT INTO challenges (title,description,story,difficulty,game_mode,language,level_req,starter_code,solution,hints,test_cases,xp_reward,time_limit) VALUES

('Hello, World!','Write a function that returns the string ''Hello, World!''.','Your first spell in the arena.','easy','puzzle','python',1,'def greet():\n    pass','def greet():\n    return ''Hello, World!''','["Use the return keyword","Return a string with quotes"]','[{"input":[],"expected_output":"Hello, World!"}]',100,120),

('Sum of Two Numbers','Write a function that returns the sum of two numbers a and b.',NULL,'easy','puzzle','python',1,'def add(a, b):\n    pass','def add(a, b):\n    return a + b','["Use the + operator","return a + b"]','[{"input":[2,3],"expected_output":"5"},{"input":[-1,1],"expected_output":"0"},{"input":[100,200],"expected_output":"300"}]',100,120),

('Is Even','Return True if a number is even, False otherwise.',NULL,'easy','puzzle','python',1,'def is_even(n):\n    pass','def is_even(n):\n    return n % 2 == 0','["Use the % operator","n % 2 == 0 means even"]','[{"input":[4],"expected_output":"True"},{"input":[7],"expected_output":"False"},{"input":[0],"expected_output":"True"}]',100,120),

('Maximum of Three','Return the largest of three numbers without using max().',NULL,'easy','puzzle','python',1,'def max_three(a, b, c):\n    pass','def max_three(a, b, c):\n    if a >= b and a >= c: return a\n    elif b >= c: return b\n    return c','["Use if/elif/else","Compare each number to the others"]','[{"input":[1,2,3],"expected_output":"3"},{"input":[10,5,8],"expected_output":"10"},{"input":[-1,-5,-3],"expected_output":"-1"}]',100,150),

('FizzBuzz','Return a list for numbers 1 to n. Multiples of 3: ''Fizz'', 5: ''Buzz'', both: ''FizzBuzz'', else number as string.','The dungeon gate is locked by a riddle. Solve FizzBuzz to proceed.','medium','quest','python',1,'def fizzbuzz(n):\n    result = []\n    return result','def fizzbuzz(n):\n    result = []\n    for i in range(1, n+1):\n        if i%15==0: result.append(''FizzBuzz'')\n        elif i%3==0: result.append(''Fizz'')\n        elif i%5==0: result.append(''Buzz'')\n        else: result.append(str(i))\n    return result','["Check 15 (FizzBuzz) first","Use range(1, n+1)","Convert numbers to str()"]','[{"input":[5],"expected_output":"[''1'', ''2'', ''Fizz'', ''4'', ''Buzz'']"},{"input":[15],"expected_output":"[''1'', ''2'', ''Fizz'', ''4'', ''Buzz'', ''Fizz'', ''7'', ''8'', ''Fizz'', ''Buzz'', ''11'', ''Fizz'', ''13'', ''14'', ''FizzBuzz'']"}]',250,300),

('Reverse a String','Return the reverse of a string without using slicing [::-1].',NULL,'medium','battle','python',1,'def reverse_string(s):\n    pass','def reverse_string(s):\n    result = ''''\n    for ch in s:\n        result = ch + result\n    return result','["Loop through each character","Prepend each character to result"]','[{"input":["hello"],"expected_output":"olleh"},{"input":["Python"],"expected_output":"nohtyP"},{"input":[""],"expected_output":""}]',250,300),

('Palindrome Check','Return True if a string is a palindrome (ignore case and spaces).','The temple door has a riddle about words that read the same forwards and backwards.','medium','debug','python',1,'def is_palindrome(s):\n    s = s.lower().replace('' '', '''')\n    pass','def is_palindrome(s):\n    s = s.lower().replace('' '', '''')\n    return s == s[::-1]','["Convert to lowercase first","Remove spaces","Compare string to its reverse"]','[{"input":["racecar"],"expected_output":"True"},{"input":["hello"],"expected_output":"False"},{"input":["A man a plan a canal Panama"],"expected_output":"True"}]',250,300),

('Count Vowels','Return the number of vowels (a,e,i,o,u) in a string (case insensitive).',NULL,'medium','puzzle','python',1,'def count_vowels(s):\n    pass','def count_vowels(s):\n    return sum(1 for c in s.lower() if c in ''aeiou'')','["Loop through each character","Check if char is in ''aeiou''","Use .lower()"]','[{"input":["Hello World"],"expected_output":"3"},{"input":["Python"],"expected_output":"1"},{"input":["aeiou"],"expected_output":"5"}]',250,300),

('Find Duplicates','Return a sorted list of all duplicate elements in a list.',NULL,'medium','puzzle','python',1,'def find_duplicates(arr):\n    pass','def find_duplicates(arr):\n    seen=set(); dupes=set()\n    for x in arr:\n        if x in seen: dupes.add(x)\n        seen.add(x)\n    return sorted(list(dupes))','["Use a set to track seen elements","Add to duplicates set if already seen","Sort the final result"]','[{"input":[[1,2,3,2,4,3]],"expected_output":"[2, 3]"},{"input":[[1,2,3]],"expected_output":"[]"},{"input":[[5,5,5]],"expected_output":"[5]"}]',250,360),

('Binary Search','Implement binary search. Return index of target, or -1 if not found.','A million scrolls in the dragon''s lair. Search smart or lose.','hard','battle','python',1,'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    pass','def binary_search(arr, target):\n    left, right = 0, len(arr)-1\n    while left <= right:\n        mid = (left+right)//2\n        if arr[mid]==target: return mid\n        elif arr[mid]<target: left=mid+1\n        else: right=mid-1\n    return -1','["mid = (left+right)//2","If target > arr[mid], move left pointer right","Return -1 if not found"]','[{"input":[[1,3,5,7,9],5],"expected_output":"2"},{"input":[[1,3,5,7,9],6],"expected_output":"-1"},{"input":[[2,4,6,8,10],10],"expected_output":"4"}]',500,600),

('Two Sum','Return sorted indices of two numbers that add up to target.',NULL,'hard','puzzle','python',1,'def two_sum(nums, target):\n    pass','def two_sum(nums, target):\n    seen={}\n    for i,n in enumerate(nums):\n        comp=target-n\n        if comp in seen: return sorted([seen[comp],i])\n        seen[n]=i\n    return []','["Use a hash map (dict)","For each number compute complement = target - n","Check if complement is already in dict"]','[{"input":[[2,7,11,15],9],"expected_output":"[0, 1]"},{"input":[[3,2,4],6],"expected_output":"[1, 2]"},{"input":[[3,3],6],"expected_output":"[0, 1]"}]',500,600),

('Flatten Nested List','Flatten an arbitrarily nested list into a single flat list.',NULL,'hard','puzzle','python',1,'def flatten(lst):\n    pass','def flatten(lst):\n    result=[]\n    for item in lst:\n        if isinstance(item,list): result.extend(flatten(item))\n        else: result.append(item)\n    return result','["Use recursion","Check isinstance(item, list)","Use extend() for sublists"]','[{"input":[[[1,[2,3]],[4,[5,[6]]]]],"expected_output":"[1, 2, 3, 4, 5, 6]"},{"input":[[[1,2],[3,4]]],"expected_output":"[1, 2, 3, 4]"}]',500,600),

('BOSS: Fibonacci Memoization','Return nth Fibonacci number using memoization. Must handle n=30 efficiently.','BOSS FIGHT — The Ancient Dragon Fibonacci blocks your path. Brute force will fail.','boss','boss','python',1,'def fib(n, memo={}):\n    pass','def fib(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = fib(n-1,memo) + fib(n-2,memo)\n    return memo[n]','["Base case: n<=1 return n","Check if n is in memo first","Store result before returning"]','[{"input":[0],"expected_output":"0"},{"input":[1],"expected_output":"1"},{"input":[10],"expected_output":"55"},{"input":[30],"expected_output":"832040"}]',1000,900),

('BOSS: Valid Parentheses','Return True if all brackets (), {}, [] are properly closed and nested.','BOSS FIGHT — The Bracket Demon. Every unmatched bracket is your enemy.','boss','boss','python',1,'def is_valid(s):\n    pass','def is_valid(s):\n    stack=[]; mapping={'')'':''('', ''}'':''{'', '']'':''[''}\n    for char in s:\n        if char in ''({['': stack.append(char)\n        elif char in mapping:\n            if not stack or stack[-1]!=mapping[char]: return False\n            stack.pop()\n    return len(stack)==0','["Use a stack (list)","Push opening brackets","For closing brackets check top of stack matches"]','[{"input":["()[]{}"],"expected_output":"True"},{"input":["([)]"],"expected_output":"False"},{"input":["{[]}"],"expected_output":"True"},{"input":["("],"expected_output":"False"}]',1000,900),

('BOSS: Merge Sort','Implement merge sort. Return the sorted list. Must be O(n log n).','MEGA BOSS — The Sort Titan. Bubble sort will be destroyed instantly.','boss','boss','python',1,'def merge_sort(arr):\n    pass','def merge_sort(arr):\n    if len(arr)<=1: return arr\n    mid=len(arr)//2\n    left=merge_sort(arr[:mid]); right=merge_sort(arr[mid:])\n    result=[]; i=j=0\n    while i<len(left) and j<len(right):\n        if left[i]<=right[j]: result.append(left[i]); i+=1\n        else: result.append(right[j]); j+=1\n    result.extend(left[i:]); result.extend(right[j:])\n    return result','["Split array in half recursively","Merge two sorted halves","Compare elements one by one during merge"]','[{"input":[[5,2,8,1,9,3]],"expected_output":"[1, 2, 3, 5, 8, 9]"},{"input":[[1]],"expected_output":"[1]"},{"input":[[-3,0,5,-1,2]],"expected_output":"[-3, -1, 0, 2, 5]"}]',1500,1200),

('Double a Number','Write a function that returns a number multiplied by 2.',NULL,'easy','puzzle','javascript',1,'function double(n) {\n  return null;\n}','function double(n) {\n  return n * 2;\n}','["Multiply by 2","return n * 2"]','[{"input":[5],"expected_output":"10"},{"input":[0],"expected_output":"0"},{"input":[-3],"expected_output":"-6"}]',100,120),

('Array Sum','Return the sum of all numbers in an array.',NULL,'easy','puzzle','javascript',1,'function arraySum(arr) {\n  return 0;\n}','function arraySum(arr) {\n  return arr.reduce((acc, val) => acc + val, 0);\n}','["Use arr.reduce()","Start with 0 as initial value"]','[{"input":[[1,2,3,4,5]],"expected_output":"15"},{"input":[[]],"expected_output":"0"},{"input":[[-1,1]],"expected_output":"0"}]',100,120),

('Filter Even Numbers','Return only the even numbers from an array.',NULL,'easy','puzzle','javascript',1,'function filterEvens(arr) {\n  return [];\n}','function filterEvens(arr) {\n  return arr.filter(n => n % 2 === 0);\n}','["Use arr.filter()","n % 2 === 0 is the even check"]','[{"input":[[1,2,3,4,5,6]],"expected_output":"[2,4,6]"},{"input":[[1,3,5]],"expected_output":"[]"}]',100,120),

('C++: Fibonacci','Return the nth Fibonacci number using iteration (no recursion).',NULL,'easy','puzzle','cpp',1,'int fibonacci(int n) {\n    return 0;\n}','int fibonacci(int n) {\n    if(n<=1) return n;\n    int a=0,b=1;\n    for(int i=2;i<=n;i++){int c=a+b;a=b;b=c;}\n    return b;\n}','["Use two variables a and b","Loop from 2 to n","c=a+b then a=b, b=c"]','[{"input":[0],"expected_output":"0"},{"input":[1],"expected_output":"1"},{"input":[10],"expected_output":"55"}]',100,180),

('C++: Count Characters','Count how many times a character appears in a string.',NULL,'easy','puzzle','cpp',1,'int countChar(std::string s, char c) {\n    return 0;\n}','int countChar(std::string s, char c) {\n    int count=0;\n    for(char ch:s) if(ch==c) count++;\n    return count;\n}','["Use a range-based for loop","Compare each char to c","Increment a counter"]','[{"input":["hello","l"],"expected_output":"2"},{"input":["mississippi","s"],"expected_output":"4"}]',100,180),

('Java: Reverse a String','Return the reverse of a string using StringBuilder.','Welcome to the Java arena.','easy','puzzle','java',1,'public static String reverseString(String s) {\n    return "";\n}','public static String reverseString(String s) {\n    return new StringBuilder(s).reverse().toString();\n}','["Create new StringBuilder(s)",".reverse() then .toString()"]','[{"input":["hello"],"expected_output":"olleh"},{"input":["Java"],"expected_output":"avaJ"}]',100,150),

('Java: Armstrong Number','Return true if n is an Armstrong number.',NULL,'easy','puzzle','java',1,'public static boolean isArmstrong(int n) {\n    return false;\n}','public static boolean isArmstrong(int n) {\n    String s=Integer.toString(n); int power=s.length(),sum=0;\n    for(char c:s.toCharArray()) sum+=Math.pow(Character.getNumericValue(c),power);\n    return sum==n;\n}','["Convert n to string to get digits","Power = number of digits","Sum each digit raised to power"]','[{"input":[153],"expected_output":"true"},{"input":[370],"expected_output":"true"},{"input":[123],"expected_output":"false"}]',100,180);

-- ── Done ─────────────────────────────────────────────────────
SELECT COUNT(*) AS challenges_inserted FROM challenges;
