const router = require('koa-router')();

const Koa = require('koa');

const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const app = new Koa();


let todos = {
  0: {'title': 'build an API', 'order': 1, 'completed': false},
  1: {'title': '?????', 'order': 2, 'completed': false},
  2: {'title': 'profit!', 'order': 3, 'completed': false}
};
let nextId = 3;

let tags = {};

router
  // todos endpoints
  .get('/todos/', todosList)
  .del('/todos/', todosClear)
  .post('/todos/', todoAdd)
  .get('todo', '/todos/:id', todoShow)
  .patch('/todos/:id', todoUpdate)
  .del('/todos/:id', todoRemove)
  // tags endpoints
  .get('/tags/',tagsList)
  .del('/tags/', tagsClear)
  .post('/tags/',tagAdd)
  .get('tag','/tags/:id',tagShow)
  .patch('/tags/:id', tagUpdate)
  .del('/tags/:id', tagRemove)
  
  // todostags endpoints
  .get('todo','/todos/:id/tags/',todosTagsList)
  .post('/todos/:id/tags/', todosTagAssociate)
  .del('/todos/:id/tags/',todosTagClear)
  .del('/todos/:todos_id/tags/:tag_id',todosTagRemove)
  // tagstodos endpoints
  .get('/tags/:id/todos/',tagsTodosList)
  ;

async function todosList(ctx) {
  ctx.body = Object.keys(todos).map(k => {
    todos[k].id = k;
    return todos[k];
  });
  console.log(ctx.body);
}

async function todosClear(ctx) {
  todos = {};
  ctx.status = 204;
}

async function todoAdd(ctx) {
  const todo = ctx.request.body;
  if (!todo['title']) ctx.throw(400, {'error': '"title" is a required field'});
  const title = todo['title'];
  if (!typeof data === 'string' || !title.length) ctx.throw(400, {'error': '"title" must be a string with at least one character'});

  todo['completed'] = todo['completed'] || false;
  todo['tags'] = todo['tags'] || [];
  todo['url'] = 'http://' + ctx.host + router.url('todo', nextId);
  todos[nextId++] = todo;

  Object.assign(todo, ctx.request.body);

  ctx.status = 303;
  ctx.set('Location', todo['url']);;
}

async function todoShow(ctx) {
  const id = ctx.params.id;
  const todo = todos[id]
  if (!todo) ctx.throw(404, {'error': 'Todo not found'});
  todo.id = id;
  ctx.body = todo;
}

async function todoUpdate(ctx) {
  const id = ctx.params.id;
  const todo = todos[id];

  Object.assign(todo, ctx.request.body);

  ctx.body = todo;
}

async function todoRemove(ctx) {
  const id = ctx.params.id;
  if (!todos[id]) ctx.throw(404, {'error': 'Todo not found'});

  delete todos[id];

  ctx.status = 204;
}

async function tagsList(ctx) {
  ctx.body = Object.keys(tags).map(k => {
    tags[k].id = k;
    return tags[k];
  }); 
}

async function tagsClear(ctx) {
  tags = {};
  ctx.status = 204;
}

async function tagAdd(ctx){
  const tag = ctx.request.body;
  if (!tag['title']) ctx.throw(400, {'error': '"title" is a required field'});
  const title = tag['title'];
  if (!typeof data === 'string' || !title.length) ctx.throw(400, {'error': '"title" must be a string with at least one character'});
  tag['todos'] = tag['todos'] || [];
  tag['url'] = 'http://' + ctx.host + router.url('tag', nextId);
  tags[nextId++] = tag;

  Object.assign(tag, ctx.request.body);

  ctx.status = 303;
  ctx.set('Location', tag['url']);

}

async function tagShow(ctx) {
  const id = ctx.params.id;
  const tag = tags[id]
  if (!tag) ctx.throw(404, {'error': 'tag not found'});
  tag.id = id;
  ctx.body = tag;
}

async function tagUpdate(ctx) {
  const id = ctx.params.id;
  const tag = tags[id];

  Object.assign(tag, ctx.request.body);

  ctx.body = tag;
}

async function tagRemove(ctx) {
  const id = ctx.params.id;
  if (!tags[id]) ctx.throw(404, {'error': 'Tag not found'});

  delete tags[id];

  ctx.status = 204;
}

async function todosTagsList(ctx) {
  const id = ctx.params.id;
  if (!todos[id]) ctx.throw(404, {'error': 'Todo not found'});
  
  todo = todos[id];
  _tags = todo['tags'];

  ctx.body = Object.keys(tags)
                   .filter(k => 
                     _tags.find((tag) =>
                        tag['id'] == k))
                   .map(key => {
                    tags[key].id = key;
                    return tags[key];
                    });
                   // console.log(ctx.body);
                   ctx.status = 200;
}

async function todosTagRemove(ctx) {
  const todos_id = ctx.params.todos_id;
  const tag_id = ctx.params.tag_id;
  if (!todos[todos_id]||!tags[tag_id]) ctx.throw(404, {'error': 'Todos / Tag not found'});

  todo = todos[todos_id];
  old_tags = todo['tags'];
  new_tags = old_tags.filter(tag => tag['id'] != tag_id);
  todo['tags'] = new_tags;
  
  ctx.body = todo;
  console.log("todosTagRemove",ctx.params,ctx.body)
}

async function todosTagAssociate(ctx) {
  const id = ctx.params.id;
  if (!todos[id]) ctx.throw(404, {'error': 'Todo not found'});

  todo = todos[id];
  tag = ctx.request.body;
  if (!tags[tag['id']]) ctx.throw(404, {'error': 'Tag not found'});
  tag = tags[tag['id']];
  todo['tags'].push(tag);
  tag['todos'].push({id: todo['id'],title: todo['title']});
  ctx.body = todo
}

async function todosTagClear(ctx) {
  const id = ctx.params.id;
  if (!todos[id]) ctx.throw(404, {'error': 'Todo not found'});
  
  todo = todos[id];
  tag = [];
  todo['tags'] = [];

  ctx.body = todo;

}

async function tagsTodosList(ctx) {
  const id = ctx.params.id;
  tag = tags[id];
  _todos = tag['todos'];

  ctx.body = _todos;
}


app
  .use(bodyParser())
  .use(cors())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(8080);
