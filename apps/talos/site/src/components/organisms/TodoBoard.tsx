import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageTitle } from '../atoms/PageTitle';
import { SegmentedFilter } from '../molecules/SegmentedFilter';
import { didKeepTodoListChoice, readKeptTodoListChoice } from '../../lib/todo-list-choice.adapter';
import { TODO_LIST_PARAMETER } from '../../lib/wikilinks.core';
import { TodoListSection } from './TodoListSection';
import { TodoQuickAdd } from './TodoQuickAdd';
import {
  readTodoListChoice,
  selectChosenTodoLists,
  selectQuickAddList,
  selectQuickAddPlaceholderKey,
  selectTodoFilterLabelKey,
  selectTodoListChoiceLabelKey,
  TODO_FILTERS,
  TODO_LIST_CHOICES,
  type TodoFilter,
  type TodoListChoice,
} from './todo-list.core';

// @FollowsBlueprint organism-presentational
export function TodoBoard(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<TodoFilter>('open');
  const choice = readTodoListChoice(
    searchParams.get(TODO_LIST_PARAMETER),
    readKeptTodoListChoice(),
  );
  const lists = selectChosenTodoLists(choice);

  return (
    <>
      <PageTitle>{t('todo.title')}</PageTitle>
      <div className="flex flex-col gap-4 pb-16">
        <SegmentedFilter
          label={t('todo.list.label')}
          options={TODO_LIST_CHOICES.map((value) => ({
            value,
            label: t(selectTodoListChoiceLabelKey(value)),
          }))}
          selected={choice}
          onSelected={(next: TodoListChoice) => {
            didKeepTodoListChoice(next);
            setSearchParams({ [TODO_LIST_PARAMETER]: next }, { replace: true });
          }}
        />
        <SegmentedFilter
          label={t('todo.filter.label')}
          options={TODO_FILTERS.map((value) => ({
            value,
            label: t(selectTodoFilterLabelKey(value)),
          }))}
          selected={filter}
          onSelected={setFilter}
        />
        {lists.map((list) => (
          <TodoListSection key={list} list={list} filter={filter} isNamed={lists.length > 1} />
        ))}
      </div>
      <TodoQuickAdd
        list={selectQuickAddList(choice)}
        placeholder={t(selectQuickAddPlaceholderKey(choice))}
      />
    </>
  );
}
