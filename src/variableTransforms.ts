const TEMPLATE_VARIABLE_REGEX = /\{\{([^|{}]+)(?:\|([^{}]+))?\}\}/g;
const TEMPLATE_IF_BLOCK_REGEX = /\{\{#if\s+([^{}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

export function getTemplateVariableRegex(): RegExp {
  return TEMPLATE_VARIABLE_REGEX;
}

export function applyVariableTransform(value: string, transform?: string): string {
  if (!transform) {
    return value;
  }

  if (value === '') {
    return value;
  }

  switch (transform.toLowerCase()) {
    case 'lowercase':
      return value.toLowerCase();
    case 'uppercase':
      return value.toUpperCase();
    case 'capitalize':
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case 'camelcase':
      return value.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
        index === 0 ? letter.toLowerCase() : letter.toUpperCase()
      ).replace(/\s+/g, '');
    case 'snakecase':
      return value
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    case 'kebabcase':
      return value
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    case 'pascalcase':
      return value
        .replace(/(?:^\w|[A-Z]|\b\w|[\s_-]+\w)/g, (match) =>
          match.replace(/[\s_-]/g, '').toUpperCase()
        )
        .replace(/[\s_-]+/g, '');
    case 'titlecase':
      return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
    case 'dotcase':
      return value
        .replace(/([a-z])([A-Z])/g, '$1.$2')
        .replace(/[\s_-]+/g, '.')
        .toLowerCase();
    case 'pathcase':
      return value
        .replace(/([a-z])([A-Z])/g, '$1/$2')
        .replace(/[._\s-]+/g, '/')
        .toLowerCase();
    case 'pluralize': {
      if (value.endsWith('y') && !/[aeiou]y$/i.test(value)) {
        return `${value.slice(0, -1)}ies`;
      }
      if (/(s|x|z|ch|sh)$/i.test(value)) {
        return `${value}es`;
      }
      return `${value}s`;
    }
    case 'singularize': {
      if (/ies$/i.test(value)) {
        return `${value.slice(0, -3)}y`;
      }
      if (/(ses|xes|zes|ches|shes)$/i.test(value)) {
        return value.slice(0, -2);
      }
      if (/s$/i.test(value) && value.length > 1) {
        return value.slice(0, -1);
      }
      return value;
    }
    default:
      return value;
  }
}

export function resolveTemplateValue(
  match: string,
  varName: string,
  transform: string | undefined,
  values: Record<string, string>
): string {
  const value = values[varName];
  if (value === undefined) {
    return match;
  }

  return applyVariableTransform(value, transform);
}

export function replaceTemplateVariables(input: string, values: Record<string, string>): string {
  const withoutConditionalBlocks = input.replace(TEMPLATE_IF_BLOCK_REGEX, (_match, varName: string, content: string) => {
    const resolved = values[varName.trim()];
    return resolved ? content : '';
  });

  return withoutConditionalBlocks.replace(getTemplateVariableRegex(), (match, varName, transform) =>
    resolveTemplateValue(match, varName, transform, values)
  );
}
